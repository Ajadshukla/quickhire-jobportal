import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { io } from "socket.io-client";
import { toast } from "sonner";
import Navbar from "./Navbar";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MESSAGES_API_ENDPOINT, REALTIME_API_URL } from "@/utils/data";

const getInitials = (name) =>
  String(name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Messages = () => {
  const { user } = useSelector((store) => store.auth);
  const [searchParams, setSearchParams] = useSearchParams();

  const [threads, setThreads] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [currentThread, setCurrentThread] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draftText, setDraftText] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState(null);

  const socketRef = useRef(null);
  const currentConversationIdRef = useRef("");
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const userRole = String(user?.role || "");
  const isStudent = userRole === "Student";
  const isRecruiter = userRole === "Recruiter";

  const canUseMessaging = isStudent || isRecruiter;
  const canStudentInteract = Boolean(conversation?.unlockedByRecruiter);
  const canSendMessage = isRecruiter || canStudentInteract;
  const canStartCall = Boolean(conversation?._id) && canSendMessage;

  const selectedApplicationFromQuery = String(searchParams.get("applicationId") || "").trim();

  const appendMessageUnique = (nextMessage) => {
    if (!nextMessage?._id) return;
    setMessages((prev) => {
      if (prev.some((item) => String(item._id) === String(nextMessage._id))) {
        return prev;
      }
      return [...prev, nextMessage];
    });
  };

  const cleanupCall = (emitEnd = false) => {
    const conversationId = currentConversationIdRef.current;
    if (emitEnd && socketRef.current && conversationId) {
      socketRef.current.emit("call:end", { conversationId });
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIncomingOffer(null);
    setInCall(false);
  };

  const fetchThreads = async () => {
    setLoadingThreads(true);
    try {
      const res = await axios.get(`${MESSAGES_API_ENDPOINT}/threads`, {
        withCredentials: true,
      });

      if (res.data?.success) {
        setThreads(Array.isArray(res.data.threads) ? res.data.threads : []);
      } else {
        setThreads([]);
      }
    } catch (error) {
      setThreads([]);
      toast.error(error?.response?.data?.message || "Unable to load message threads");
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
        setCurrentThread(res.data.thread || null);
        setConversation(res.data.conversation || null);
        setMessages(Array.isArray(res.data.messages) ? res.data.messages : []);
      }
    } catch (error) {
      setConversation(null);
      setMessages([]);
      toast.error(error?.response?.data?.message || "Unable to open conversation");
    } finally {
      setLoadingConversation(false);
    }
  };

  const createPeerConnection = (conversationId) => {
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    connection.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current) return;
      socketRef.current.emit("call:ice-candidate", {
        conversationId,
        candidate: event.candidate,
      });
    };

    connection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current = connection;
    return connection;
  };

  const ensureMediaStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  };

  const startCall = async () => {
    if (!canStartCall || !socketRef.current || !conversation?._id) return;

    try {
      const stream = await ensureMediaStream();
      const connection = createPeerConnection(conversation._id);
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      socketRef.current.emit("call:offer", {
        conversationId: conversation._id,
        sdp: offer,
      });

      setInCall(true);
    } catch {
      toast.error("Unable to start call. Check camera/microphone permissions.");
      cleanupCall(false);
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingOffer || !conversation?._id || !socketRef.current) return;

    try {
      const stream = await ensureMediaStream();
      const connection = createPeerConnection(conversation._id);
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));

      await connection.setRemoteDescription(new RTCSessionDescription(incomingOffer.sdp));
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);

      socketRef.current.emit("call:answer", {
        conversationId: conversation._id,
        sdp: answer,
      });

      setIncomingOffer(null);
      setInCall(true);
    } catch {
      toast.error("Unable to accept call.");
      cleanupCall(false);
    }
  };

  const declineIncomingCall = () => {
    setIncomingOffer(null);
    cleanupCall(true);
  };

  const sendMessage = async (event) => {
    event.preventDefault();

    const text = String(draftText || "").trim();
    if (!text || sending) return;

    if (!selectedApplicationId) {
      toast.error("Please choose an accepted application first");
      return;
    }

    if (!canSendMessage && !isRecruiter) {
      toast.error("Waiting for recruiter to start the conversation");
      return;
    }

    setSending(true);

    try {
      if (!conversation?._id) {
        if (!isRecruiter) {
          toast.error("Only recruiter can send the first message");
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
          await fetchThreads();
          setDraftText("");
        }
      } else {
        const res = await axios.post(
          `${MESSAGES_API_ENDPOINT}/send/${conversation._id}`,
          { text },
          { withCredentials: true }
        );

        if (res.data?.success && res.data?.message) {
          appendMessageUnique(res.data.message);
          setConversation(res.data.conversation || conversation);
          setDraftText("");
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
    if (!user?._id || !canUseMessaging) return;
    fetchThreads();
  }, [user?._id, canUseMessaging]);

  useEffect(() => {
    if (!threads.length) return;

    const validSelected = threads.find(
      (thread) => String(thread.applicationId) === String(selectedApplicationId)
    );

    if (validSelected) return;

    if (selectedApplicationFromQuery) {
      const fromQuery = threads.find(
        (thread) => String(thread.applicationId) === String(selectedApplicationFromQuery)
      );
      if (fromQuery) {
        setSelectedApplicationId(String(fromQuery.applicationId));
        return;
      }
    }

    setSelectedApplicationId(String(threads[0].applicationId));
  }, [threads, selectedApplicationId, selectedApplicationFromQuery]);

  useEffect(() => {
    if (!selectedApplicationId) return;
    setSearchParams({ applicationId: selectedApplicationId });
    fetchConversation(selectedApplicationId);
    cleanupCall(false);
  }, [selectedApplicationId]);

  useEffect(() => {
    currentConversationIdRef.current = String(conversation?._id || "");
    if (conversation?._id && socketRef.current) {
      socketRef.current.emit("conversation:join", {
        conversationId: conversation._id,
      });
    }
  }, [conversation?._id]);

  useEffect(() => {
    if (!user?._id || !canUseMessaging) return;

    const socket = io(REALTIME_API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("message:new", (payload = {}) => {
      if (String(payload?.conversationId || "") !== String(currentConversationIdRef.current || "")) return;
      appendMessageUnique(payload?.message);
    });

    socket.on("call:offer", (payload = {}) => {
      if (String(payload?.conversationId || "") !== String(currentConversationIdRef.current || "")) return;
      setIncomingOffer(payload);
    });

    socket.on("call:answer", async (payload = {}) => {
      if (String(payload?.conversationId || "") !== String(currentConversationIdRef.current || "")) return;
      if (!peerConnectionRef.current || !payload?.sdp) return;
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      setInCall(true);
    });

    socket.on("call:ice-candidate", async (payload = {}) => {
      if (String(payload?.conversationId || "") !== String(currentConversationIdRef.current || "")) return;
      if (!peerConnectionRef.current || !payload?.candidate) return;
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {
        // Ignore invalid or stale candidates.
      }
    });

    socket.on("call:end", () => {
      cleanupCall(false);
    });

    socket.on("conversation:error", (payload = {}) => {
      if (payload?.message) toast.error(payload.message);
    });

    socket.on("call:error", (payload = {}) => {
      if (payload?.message) toast.error(payload.message);
    });

    return () => {
      cleanupCall(false);
      socket.disconnect();
      socketRef.current = null;
      currentConversationIdRef.current = "";
      setSocketConnected(false);
    };
  }, [user?._id, canUseMessaging]);

  const headerStatus = useMemo(() => {
    if (!conversation?._id) {
      return isRecruiter
        ? "Send first message to unlock student chat and video call"
        : "Waiting for recruiter to send the first message";
    }

    return canStudentInteract
      ? "Chat and video call unlocked"
      : "Waiting for recruiter to unlock this conversation";
  }, [conversation?._id, canStudentInteract, isRecruiter]);

  return (
    <div className="qh-page">
      <Navbar />

      <div className="qh-shell py-6">
        {!canUseMessaging ? (
          <div className="qh-panel text-sm text-slate-600 dark:text-slate-300">
            Messaging is available only for students and recruiters with accepted applications.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <aside className="qh-panel lg:col-span-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="qh-display text-lg font-bold">Conversations</h2>
                <span className={`text-xs font-semibold ${socketConnected ? "text-emerald-600" : "text-slate-500"}`}>
                  {socketConnected ? "Realtime On" : "Realtime Off"}
                </span>
              </div>

              {loadingThreads ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">Loading accepted applications...</p>
              ) : threads.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  No accepted applications available for messaging yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {threads.map((thread) => {
                    const active = String(thread.applicationId) === String(selectedApplicationId);
                    return (
                      <button
                        key={thread.applicationId}
                        type="button"
                        onClick={() => setSelectedApplicationId(String(thread.applicationId))}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          active
                            ? "border-teal-500 bg-teal-50 dark:border-teal-400 dark:bg-teal-900/20"
                            : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={thread?.peer?.profile?.profilePhoto || ""} alt="peer" />
                            <AvatarFallback>{getInitials(thread?.peer?.fullname)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {thread?.peer?.fullname || "User"}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{thread?.job?.title || "Job"}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                          {thread?.conversationId
                            ? thread?.lastMessageText || "Open conversation"
                            : "No conversation yet"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            <section className="qh-panel lg:col-span-8">
              {!selectedApplicationId ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">Select an accepted application to start messaging.</p>
              ) : loadingConversation ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">Loading conversation...</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        {currentThread?.peer?.fullname || "Conversation"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {currentThread?.job?.title || "Accepted application"}
                      </p>
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{headerStatus}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {canStartCall ? (
                        <>
                          {!inCall ? (
                            <Button type="button" onClick={startCall}>Start Video Call</Button>
                          ) : (
                            <Button type="button" variant="outline" onClick={() => cleanupCall(true)}>
                              End Call
                            </Button>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>

                  {(inCall || incomingOffer) && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                        <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Your Camera</p>
                        <video ref={localVideoRef} autoPlay playsInline muted className="h-48 w-full rounded-lg bg-slate-900 object-cover" />
                      </div>
                      <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                        <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Remote Camera</p>
                        <video ref={remoteVideoRef} autoPlay playsInline className="h-48 w-full rounded-lg bg-slate-900 object-cover" />
                      </div>
                    </div>
                  )}

                  {incomingOffer && !inCall ? (
                    <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-900/20">
                      <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">Incoming video call</p>
                      <div className="mt-2 flex gap-2">
                        <Button type="button" onClick={acceptIncomingCall}>Accept</Button>
                        <Button type="button" variant="outline" onClick={declineIncomingCall}>Decline</Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="h-[40vh] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                    {messages.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No messages yet.</p>
                    ) : (
                      messages.map((msg) => {
                        const mine = String(msg?.sender?._id || "") === String(user?._id || "");
                        return (
                          <div
                            key={msg._id}
                            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                              mine
                                ? "ml-auto bg-teal-600 text-white"
                                : "bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                            }`}
                          >
                            <p>{msg?.text}</p>
                            <p className={`mt-1 text-[10px] ${mine ? "text-teal-100" : "text-slate-500 dark:text-slate-400"}`}>
                              {msg?.sender?.fullname || "User"} • {formatDate(msg?.createdAt)}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={sendMessage} className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={draftText}
                      onChange={(event) => setDraftText(event.target.value)}
                      placeholder={
                        canSendMessage
                          ? "Type your message"
                          : "Recruiter first message required to unlock chat"
                      }
                      disabled={!canSendMessage && !isRecruiter}
                      className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                    <Button
                      type="submit"
                      disabled={sending || !String(draftText || "").trim() || (!canSendMessage && !isRecruiter)}
                    >
                      {sending
                        ? "Sending..."
                        : conversation?._id
                        ? "Send"
                        : isRecruiter
                        ? "Start Conversation"
                        : "Locked"}
                    </Button>
                  </form>

                  {!isRecruiter && !conversation?._id ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Recruiter needs to send first message before you can chat or start video calls.
                    </p>
                  ) : null}

                  {!user ? (
                    <Link to="/login" className="text-sm text-teal-700 hover:underline dark:text-teal-300">
                      Login to use messaging
                    </Link>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
