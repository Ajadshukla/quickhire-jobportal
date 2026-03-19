import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { io } from "socket.io-client";
import { MessageCircle, Minus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { MESSAGES_API_ENDPOINT, REALTIME_API_URL } from "@/utils/data";

const getInitials = (name) =>
  String(name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const QuickInboxDock = () => {
  const { user } = useSelector((store) => store.auth);

  const isStudent = String(user?.role || "") === "Student";
  const isRecruiter = String(user?.role || "") === "Recruiter";
  const canUseMessaging = Boolean(user?._id) && (isStudent || isRecruiter);

  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const socketRef = useRef(null);
  const conversationIdRef = useRef("");

  const selectedThread = threads.find(
    (thread) => String(thread.applicationId) === String(selectedApplicationId)
  );

  const canStudentInteract = Boolean(conversation?.unlockedByRecruiter);
  const canSendMessage = isRecruiter || canStudentInteract;

  const fetchThreads = async () => {
    if (!canUseMessaging) return;
    setLoadingThreads(true);
    try {
      const res = await axios.get(`${MESSAGES_API_ENDPOINT}/threads`, {
        withCredentials: true,
      });
      if (res.data?.success) {
        const nextThreads = Array.isArray(res.data.threads) ? res.data.threads : [];
        setThreads(nextThreads);

        if (!selectedApplicationId && nextThreads.length > 0) {
          setSelectedApplicationId(String(nextThreads[0].applicationId));
        }
      }
    } catch {
      // Keep dock silent to avoid noise during browsing.
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchConversation = async (applicationId) => {
    if (!applicationId) return;

    setLoadingConversation(true);
    try {
      const res = await axios.get(`${MESSAGES_API_ENDPOINT}/conversation/${applicationId}`, {
        withCredentials: true,
      });

      if (res.data?.success) {
        setConversation(res.data.conversation || null);
        setMessages(Array.isArray(res.data.messages) ? res.data.messages : []);
      }
    } catch {
      setConversation(null);
      setMessages([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  const appendMessageUnique = (nextMessage) => {
    if (!nextMessage?._id) return;
    setMessages((prev) => {
      if (prev.some((item) => String(item._id) === String(nextMessage._id))) return prev;
      return [...prev, nextMessage];
    });
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = String(draft || "").trim();
    if (!text || sending || !selectedApplicationId) return;

    if (!canSendMessage && !isRecruiter) {
      toast.error("Recruiter must send first message.");
      return;
    }

    setSending(true);
    try {
      if (!conversation?._id) {
        if (!isRecruiter) {
          toast.error("Only recruiter can start this chat.");
          return;
        }

        const res = await axios.post(
          `${MESSAGES_API_ENDPOINT}/initiate/${selectedApplicationId}`,
          { text },
          { withCredentials: true }
        );

        if (res.data?.success) {
          setConversation(res.data.conversation || null);
          setMessages(Array.isArray(res.data.messages) ? res.data.messages : []);
          setDraft("");
          await fetchThreads();
        }
      } else {
        const res = await axios.post(
          `${MESSAGES_API_ENDPOINT}/send/${conversation._id}`,
          { text },
          { withCredentials: true }
        );

        if (res.data?.success && res.data?.message) {
          appendMessageUnique(res.data.message);
          setDraft("");
          await fetchThreads();
        }
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to send message");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!canUseMessaging) return;
    fetchThreads();
  }, [canUseMessaging]);

  useEffect(() => {
    if (!selectedApplicationId) return;
    fetchConversation(selectedApplicationId);
  }, [selectedApplicationId]);

  useEffect(() => {
    if (!conversation?._id || !socketRef.current) return;
    conversationIdRef.current = String(conversation._id);
    socketRef.current.emit("conversation:join", {
      conversationId: conversation._id,
    });
  }, [conversation?._id]);

  useEffect(() => {
    if (!canUseMessaging) return;

    const socket = io(REALTIME_API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("message:new", (payload = {}) => {
      const payloadConversationId = String(payload?.conversationId || "");
      const currentConversationId = String(conversationIdRef.current || "");

      if (payloadConversationId && payloadConversationId === currentConversationId) {
        appendMessageUnique(payload?.message);
      } else {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      conversationIdRef.current = "";
    };
  }, [canUseMessaging]);

  useEffect(() => {
    if (open) {
      setUnreadCount(0);
    }
  }, [open]);

  const openFullMessages = () => {
    const next = selectedApplicationId
      ? `/messages?applicationId=${selectedApplicationId}`
      : "/messages";
    window.location.href = next;
  };

  if (!canUseMessaging) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      {open ? (
        <div className="h-[70vh] w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Inbox</p>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={openFullMessages}>Open Full</Button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid h-[calc(70vh-48px)] grid-cols-12">
            <div className="col-span-5 border-r border-slate-200 dark:border-slate-700">
              {loadingThreads ? (
                <p className="p-2 text-xs text-slate-500">Loading...</p>
              ) : threads.length === 0 ? (
                <p className="p-2 text-xs text-slate-500">No accepted chats</p>
              ) : (
                <div className="h-full overflow-y-auto p-2 space-y-1">
                  {threads.map((thread) => {
                    const active = String(thread.applicationId) === String(selectedApplicationId);
                    return (
                      <button
                        key={thread.applicationId}
                        type="button"
                        onClick={() => setSelectedApplicationId(String(thread.applicationId))}
                        className={`w-full rounded-lg p-2 text-left ${
                          active ? "bg-teal-50 dark:bg-teal-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {thread?.peer?.fullname || "User"}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">{thread?.job?.title || "Job"}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="col-span-7 flex h-full flex-col">
              <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={selectedThread?.peer?.profile?.profilePhoto || ""} alt="peer" />
                    <AvatarFallback>{getInitials(selectedThread?.peer?.fullname)}</AvatarFallback>
                  </Avatar>
                  <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {selectedThread?.peer?.fullname || "Select chat"}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50/60 p-2 dark:bg-slate-900/50">
                {loadingConversation ? (
                  <p className="text-xs text-slate-500">Loading conversation...</p>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-slate-500">No messages yet.</p>
                ) : (
                  messages.map((msg) => {
                    const mine = String(msg?.sender?._id || "") === String(user?._id || "");
                    return (
                      <div
                        key={msg._id}
                        className={`max-w-[90%] rounded-lg px-2 py-1 text-xs ${
                          mine
                            ? "ml-auto bg-teal-600 text-white"
                            : "bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        }`}
                      >
                        {msg?.text}
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={sendMessage} className="border-t border-slate-200 p-2 dark:border-slate-700">
                <div className="flex items-center gap-1">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={
                      canSendMessage || isRecruiter
                        ? "Message..."
                        : "Recruiter needs to start first"
                    }
                    disabled={(!canSendMessage && !isRecruiter) || !selectedApplicationId}
                    className="h-9 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={sending || !String(draft || "").trim() || ((!canSendMessage && !isRecruiter) || !selectedApplicationId)}
                    className="rounded-md bg-slate-900 p-2 text-white disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800"
          title="Open inbox"
        >
          <MessageCircle className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      )}
    </div>
  );
};

export default QuickInboxDock;
