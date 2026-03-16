import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "./Navbar";
import useGetAppliedJobs from "@/hooks/useGetAllAppliedJobs";
import { useSelector } from "react-redux";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import axios from "axios";
import { USER_API_ENDPOINT } from "@/utils/data";
import { toast } from "sonner";
import { Mic, MicOff, Video, Sparkles } from "lucide-react";

const RESOURCE_LIBRARY = [
  {
    topic: "frontend",
    keywords: ["frontend", "react", "javascript", "css", "ui"],
    videos: [
      {
        title: "React Course - Beginner to Advanced",
        channel: "freeCodeCamp.org",
        embedUrl: "https://www.youtube.com/embed/bMknfKXIFA8",
        watchUrl: "https://www.youtube.com/watch?v=bMknfKXIFA8",
      },
      {
        title: "JavaScript Full Course",
        channel: "Programming with Mosh",
        embedUrl: "https://www.youtube.com/embed/W6NZfCO5SIk",
        watchUrl: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
      },
    ],
    websites: [
      { name: "MDN Web Docs", url: "https://developer.mozilla.org/" },
      { name: "React Docs", url: "https://react.dev/" },
      { name: "JavaScript.info", url: "https://javascript.info/" },
    ],
  },
  {
    topic: "backend",
    keywords: ["backend", "node", "express", "api", "microservice", "java", "spring"],
    videos: [
      {
        title: "Node.js and Express.js - Full Course",
        channel: "freeCodeCamp.org",
        embedUrl: "https://www.youtube.com/embed/Oe421EPjeBE",
        watchUrl: "https://www.youtube.com/watch?v=Oe421EPjeBE",
      },
      {
        title: "REST API Crash Course",
        channel: "Traversy Media",
        embedUrl: "https://www.youtube.com/embed/Q-BpqyOT3a8",
        watchUrl: "https://www.youtube.com/watch?v=Q-BpqyOT3a8",
      },
    ],
    websites: [
      { name: "Express Docs", url: "https://expressjs.com/" },
      { name: "Node.js Docs", url: "https://nodejs.org/en/docs" },
      { name: "Roadmap.sh Backend", url: "https://roadmap.sh/backend" },
    ],
  },
  {
    topic: "data-science",
    keywords: ["data", "analyst", "scientist", "pandas", "statistics", "excel", "power bi"],
    videos: [
      {
        title: "Data Analytics Full Course",
        channel: "Simplilearn",
        embedUrl: "https://www.youtube.com/embed/r-uOLxNrNk8",
        watchUrl: "https://www.youtube.com/watch?v=r-uOLxNrNk8",
      },
      {
        title: "SQL Tutorial for Beginners",
        channel: "Programming with Mosh",
        embedUrl: "https://www.youtube.com/embed/7S_tz1z_5bA",
        watchUrl: "https://www.youtube.com/watch?v=7S_tz1z_5bA",
      },
    ],
    websites: [
      { name: "Kaggle Learn", url: "https://www.kaggle.com/learn" },
      { name: "SQLBolt", url: "https://sqlbolt.com/" },
      { name: "Roadmap.sh Data Analyst", url: "https://roadmap.sh/data-analyst" },
    ],
  },
  {
    topic: "machine-learning",
    keywords: ["machine learning", "ml", "ai", "tensorflow", "model"],
    videos: [
      {
        title: "Machine Learning for Everybody",
        channel: "freeCodeCamp.org",
        embedUrl: "https://www.youtube.com/embed/i_LwzRVP7bg",
        watchUrl: "https://www.youtube.com/watch?v=i_LwzRVP7bg",
      },
      {
        title: "Neural Networks in 100 Seconds",
        channel: "Fireship",
        embedUrl: "https://www.youtube.com/embed/aircAruvnKk",
        watchUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
      },
    ],
    websites: [
      { name: "Google ML Crash Course", url: "https://developers.google.com/machine-learning/crash-course" },
      { name: "scikit-learn Docs", url: "https://scikit-learn.org/stable/" },
      { name: "Roadmap.sh AI/ML", url: "https://roadmap.sh/ai-data-scientist" },
    ],
  },
  {
    topic: "devops-cloud",
    keywords: ["devops", "cloud", "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "terraform"],
    videos: [
      {
        title: "DevOps Course for Beginners",
        channel: "TechWorld with Nana",
        embedUrl: "https://www.youtube.com/embed/0yWAtQ6wYNM",
        watchUrl: "https://www.youtube.com/watch?v=0yWAtQ6wYNM",
      },
      {
        title: "Docker Tutorial for Beginners",
        channel: "Programming with Mosh",
        embedUrl: "https://www.youtube.com/embed/pTFZFxd4hOI",
        watchUrl: "https://www.youtube.com/watch?v=pTFZFxd4hOI",
      },
    ],
    websites: [
      { name: "Docker Docs", url: "https://docs.docker.com/" },
      { name: "Kubernetes Docs", url: "https://kubernetes.io/docs/home/" },
      { name: "Roadmap.sh DevOps", url: "https://roadmap.sh/devops" },
    ],
  },
  {
    topic: "mobile-android",
    keywords: ["android", "mobile", "kotlin", "app development"],
    videos: [
      {
        title: "Android Development for Beginners",
        channel: "freeCodeCamp.org",
        embedUrl: "https://www.youtube.com/embed/fis26HvvDII",
        watchUrl: "https://www.youtube.com/watch?v=fis26HvvDII",
      },
      {
        title: "Kotlin Course for Beginners",
        channel: "Programming with Mosh",
        embedUrl: "https://www.youtube.com/embed/F9UC9DY-vIU",
        watchUrl: "https://www.youtube.com/watch?v=F9UC9DY-vIU",
      },
    ],
    websites: [
      { name: "Android Developers", url: "https://developer.android.com/" },
      { name: "Kotlin Docs", url: "https://kotlinlang.org/docs/home.html" },
      { name: "Roadmap.sh Android", url: "https://roadmap.sh/android" },
    ],
  },
  {
    topic: "general-software",
    keywords: [],
    videos: [
      {
        title: "System Design Course for Beginners",
        channel: "freeCodeCamp.org",
        embedUrl: "https://www.youtube.com/embed/UzLMhqg3_Wc",
        watchUrl: "https://www.youtube.com/watch?v=UzLMhqg3_Wc",
      },
      {
        title: "Data Structures and Algorithms Course",
        channel: "freeCodeCamp.org",
        embedUrl: "https://www.youtube.com/embed/8hly31xKli0",
        watchUrl: "https://www.youtube.com/watch?v=8hly31xKli0",
      },
    ],
    websites: [
      { name: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/" },
      { name: "LeetCode", url: "https://leetcode.com/" },
      { name: "Roadmap.sh", url: "https://roadmap.sh/" },
    ],
  },
];

const pickResourceSetFromJob = (job) => {
  if (!job) return RESOURCE_LIBRARY[RESOURCE_LIBRARY.length - 1];

  const haystack = `${job.title || ""} ${job.description || ""} ${(job.requirements || []).join(" ")}`.toLowerCase();

  for (const item of RESOURCE_LIBRARY) {
    if (!item.keywords.length) continue;
    if (item.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      return item;
    }
  }

  return RESOURCE_LIBRARY[RESOURCE_LIBRARY.length - 1];
};

const Preparation = () => {
  useGetAppliedJobs();

  const { user } = useSelector((store) => store.auth);
  const { allAppliedJobs } = useSelector((store) => store.job);

  const [selectedJobId, setSelectedJobId] = useState("");
  const [questionCount, setQuestionCount] = useState(20);

  const [qaLoading, setQaLoading] = useState(false);
  const [qaData, setQaData] = useState(null);

  const [mockLoading, setMockLoading] = useState(false);
  const [mockData, setMockData] = useState(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answersMap, setAnswersMap] = useState({});

  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptBaseRef = useRef("");

  const appliedJobs = useMemo(
    () =>
      (allAppliedJobs || [])
        .map((item) => item.job)
        .filter(Boolean)
        .filter((job, idx, arr) => arr.findIndex((j) => j._id === job._id) === idx),
    [allAppliedJobs]
  );

  const currentQuestion = mockData?.questions?.[currentQuestionIndex] || "";
  const selectedJob = useMemo(
    () => appliedJobs.find((job) => job._id === selectedJobId) || null,
    [appliedJobs, selectedJobId]
  );
  const selectedResourceSet = useMemo(() => pickResourceSetFromJob(selectedJob), [selectedJob]);
  const activeVideo = selectedResourceSet?.videos?.[activeVideoIndex] || selectedResourceSet?.videos?.[0];

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(Boolean(SpeechRecognition));

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const saved = answersMap[currentQuestionIndex] || "";
    setCurrentAnswer(saved);
    transcriptBaseRef.current = saved;
  }, [currentQuestionIndex, answersMap]);

  useEffect(() => {
    setActiveVideoIndex(0);
  }, [selectedJobId]);

  const requireJobSelection = () => {
    if (!selectedJobId) {
      toast.error("Please select a target job first.");
      return false;
    }
    return true;
  };

  const generateQaPrep = async (count) => {
    if (!requireJobSelection()) return;

    try {
      setQaLoading(true);
      setQuestionCount(count);
      const res = await axios.get(`${USER_API_ENDPOINT}/preparation/questions/${selectedJobId}?count=${count}`, {
        withCredentials: true,
      });

      if (res.data?.success) {
        setQaData(res.data.data);
        toast.success(`Generated ${count} preparation Q&A.`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate preparation questions");
    } finally {
      setQaLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      if (streamRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error("Camera permission denied or unavailable.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const generateMockInterview = async () => {
    if (!requireJobSelection()) return;

    try {
      setMockLoading(true);
      setEvaluation(null);
      const res = await axios.get(`${USER_API_ENDPOINT}/preparation/mock/${selectedJobId}?count=8`, {
        withCredentials: true,
      });

      if (res.data?.success) {
        setMockData(res.data.data);
        setCurrentQuestionIndex(0);
        setAnswersMap({});
        setCurrentAnswer("");
        await startCamera();
        toast.success("Mock interview is ready.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate mock interview");
    } finally {
      setMockLoading(false);
    }
  };

  const speakCurrentQuestion = () => {
    if (!currentQuestion) return;
    if (!window.speechSynthesis) {
      toast.error("Speech playback is not supported in this browser.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(currentQuestion);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (listening) {
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = navigator.language || "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);

      recognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            finalText += piece + " ";
          } else {
            interimText += piece + " ";
          }
        }

        if (finalText.trim()) {
          transcriptBaseRef.current = `${transcriptBaseRef.current} ${finalText}`.trim();
        }

        const nextText = `${transcriptBaseRef.current} ${interimText}`.trim();
        setCurrentAnswer(nextText);
      };

      recognition.onerror = (event) => {
        const code = String(event?.error || "unknown");
        const hints = {
          "not-allowed": "Microphone permission is blocked. Allow mic access in browser site settings.",
          "service-not-allowed": "Speech service is blocked by the browser. Check site settings and retry.",
          "audio-capture": "No microphone detected. Connect a mic and try again.",
          "network": "Speech recognition network error. Check internet and retry.",
          "aborted": "Voice capture stopped.",
          "no-speech": "No speech detected. Speak clearly and try again.",
        };

        if (code !== "aborted") {
          toast.error(hints[code] || `Voice capture failed (${code}).`);
        }
      };

      recognitionRef.current = recognition;
    }

    transcriptBaseRef.current = currentAnswer.trim();

    try {
      recognitionRef.current.start();
    } catch (error) {
      toast.error("Voice capture could not start. If microphone is busy, stop camera and retry.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const saveCurrentAnswer = () => {
    setAnswersMap((prev) => ({
      ...prev,
      [currentQuestionIndex]: currentAnswer.trim(),
    }));
    toast.success("Answer saved.");
  };

  const submitForEvaluation = async () => {
    if (!mockData?.questions?.length) {
      toast.error("Generate mock interview first.");
      return;
    }

    const payloadAnswers = mockData.questions
      .map((q, index) => ({
        question: q,
        answer: index === currentQuestionIndex ? currentAnswer.trim() : (answersMap[index] || "").trim(),
      }))
      .filter((item) => item.answer);

    if (!payloadAnswers.length) {
      toast.error("Please answer at least one question before evaluation.");
      return;
    }

    try {
      setEvaluationLoading(true);
      const res = await axios.post(
        `${USER_API_ENDPOINT}/preparation/mock/${selectedJobId}/evaluate`,
        { answers: payloadAnswers },
        { withCredentials: true }
      );

      if (res.data?.success) {
        setEvaluation(res.data.data);
        toast.success("Interview analysis generated.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to evaluate interview answers");
    } finally {
      setEvaluationLoading(false);
    }
  };

  return (
    <div className="qh-page">
      <Navbar />
      <div className="qh-shell py-8 space-y-6">
        <div className="qh-panel">
          <h1 className="qh-title flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            AI Preparation Studio
          </h1>
          <p className="qh-subtitle mt-2">
            Welcome {user?.fullname || "Student"}. Select an applied job and start your preparation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 px-3 py-2 text-slate-800 dark:text-slate-100"
            >
              <option value="">Select applied job</option>
              {appliedJobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.title} - {job.company?.name || "Company"}
                </option>
              ))}
            </select>

            <Button onClick={() => generateQaPrep(20)} disabled={qaLoading}>
              {qaLoading && questionCount === 20 ? "Generating..." : "Generate 20 Q&A"}
            </Button>
            <Button onClick={() => generateQaPrep(30)} disabled={qaLoading} variant="outline">
              {qaLoading && questionCount === 30 ? "Generating..." : "Generate 30 Q&A"}
            </Button>
          </div>
        </div>

        <div className="qh-panel">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="qh-display text-2xl font-bold">Preparation Questions</h2>
            <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-200">
              {qaData?.questions?.length || 0} Questions
            </Badge>
          </div>

          {!qaData?.questions?.length ? (
            <p className="qh-subtitle mt-3">Generate a Q&A set from your selected job.</p>
          ) : (
            <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {qaData.questions.map((item, idx) => (
                <details key={idx} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/55 p-4">
                  <summary className="cursor-pointer font-semibold text-slate-800 dark:text-slate-100">
                    Q{idx + 1}. {item.question}
                  </summary>
                  <p className="mt-3 text-slate-700 dark:text-slate-300">{item.answer}</p>
                </details>
              ))}
            </div>
          )}
        </div>

        <div className="qh-panel">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="qh-display text-2xl font-bold">Topic Study Resources</h2>
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
              Topic: {selectedResourceSet.topic}
            </Badge>
          </div>

          <p className="qh-subtitle mt-3">
            {selectedJob
              ? `Based on selected job: ${selectedJob.title}`
              : "Select a job above to get topic-matched videos and websites."}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white/70 dark:bg-slate-900/55">
              {activeVideo ? (
                <>
                  <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <iframe
                      className="h-full w-full"
                      src={activeVideo.embedUrl}
                      title={activeVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                  <p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{activeVideo.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Channel: {activeVideo.channel}</p>
                </>
              ) : (
                <p className="qh-subtitle">No video resource available.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white/70 dark:bg-slate-900/55">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Recommended Videos</h3>
              <div className="mt-2 space-y-2">
                {(selectedResourceSet.videos || []).map((video, idx) => (
                  <button
                    key={video.watchUrl}
                    type="button"
                    onClick={() => setActiveVideoIndex(idx)}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                      idx === activeVideoIndex
                        ? "border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200"
                        : "border-slate-200 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {video.title}
                  </button>
                ))}
              </div>

              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-4">Where to Study</h3>
              <div className="mt-2 space-y-2">
                {(selectedResourceSet.websites || []).map((site) => (
                  <a
                    key={site.url}
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {site.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="qh-panel">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="qh-display text-2xl font-bold">Mock Interview</h2>
            <div className="flex items-center gap-2">
              <Button onClick={generateMockInterview} disabled={mockLoading}>
                {mockLoading ? "Preparing..." : "Start Mock Interview"}
              </Button>
              <Button variant="outline" onClick={stopCamera}>Stop Camera</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-black/90 overflow-hidden min-h-[280px] relative">
              <video ref={videoRef} autoPlay muted className="h-full w-full object-cover" />
              {!streamRef.current && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-300 gap-2">
                  <Video className="h-5 w-5" /> Camera preview will appear here
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/65 p-4">
              {!mockData?.questions?.length ? (
                <p className="qh-subtitle">Generate mock interview to begin.</p>
              ) : (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Question {currentQuestionIndex + 1} of {mockData.questions.length}
                  </p>
                  <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{currentQuestion}</h3>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button variant="outline" onClick={speakCurrentQuestion}>Ask Question</Button>
                    {speechSupported ? (
                      listening ? (
                        <Button variant="outline" onClick={stopListening}>
                          <MicOff className="h-4 w-4 mr-1" /> Stop Listening
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={startListening}>
                          <Mic className="h-4 w-4 mr-1" /> Start Listening
                        </Button>
                      )
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                        Speech recognition not supported
                      </Badge>
                    )}
                  </div>

                  <textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Your answer (voice transcript or typed response)"
                    className="w-full mt-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 p-3 text-slate-800 dark:text-slate-100 min-h-[120px]"
                  />

                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button variant="outline" onClick={saveCurrentAnswer}>Save Answer</Button>
                    <Button
                      variant="outline"
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={currentQuestionIndex >= (mockData.questions.length - 1)}
                      onClick={() => setCurrentQuestionIndex((prev) => Math.min(mockData.questions.length - 1, prev + 1))}
                    >
                      Next
                    </Button>
                    <Button onClick={submitForEvaluation} disabled={evaluationLoading}>
                      {evaluationLoading ? "Analyzing..." : "Analyze My Interview"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {evaluation && (
            <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Interview Evaluation</h3>
                <Badge className="bg-blue-600 text-white">Score: {evaluation.overallScore}%</Badge>
                <Badge className="bg-emerald-600 text-white">{evaluation.verdict}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Strengths</h4>
                  <ul className="list-disc pl-5 text-slate-700 dark:text-slate-300 mt-2 space-y-1">
                    {(evaluation.strengths || []).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Improvements</h4>
                  <ul className="list-disc pl-5 text-slate-700 dark:text-slate-300 mt-2 space-y-1">
                    {(evaluation.improvements || []).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {(evaluation.perQuestion || []).map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{item.question}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Score: {item.score}/10</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{item.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Preparation;
