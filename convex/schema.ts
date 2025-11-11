import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Your app's user table (synced with Better Auth)
  user: defineTable({
    authId: v.string(), // Reference to Better Auth user ID
    email: v.string(),
    name: v.string(),
    image: v.optional(v.string()),
    displayUsername: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    role: v.optional(v.string()),
    banned: v.optional(v.boolean()),
    onboarded: v.optional(v.boolean()), // Track if user completed onboarding
    onboardingStep: v.optional(v.number()), // Current onboarding step

    preferences: v.optional(
      v.object({
        studyGoals: v.optional(v.array(v.string())), // Changed to optional
        examTargets: v.optional(v.array(v.string())), // Changed to optional
        subjectsOfInterest: v.optional(v.array(v.string())), // Changed to optional
        preferredStudyTime: v.optional(v.string()),
        learningStyle: v.optional(v.string()),
        aiProvider: v.optional(v.string()),
        aiApiKey: v.optional(v.string()),
        theme: v.optional(v.string()),
        notificationsEnabled: v.optional(v.boolean()),
        languagePreference: v.optional(v.string()),
      }),
    ),

    theme: v.optional(v.string()), // light/dark
    streakDays: v.optional(v.number()), // Current study streak
    lastActivityDate: v.optional(v.number()), // Last activity timestamp
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authId", ["authId"])
    .index("by_email", ["email"]),

  revisionSets: defineTable({
    title: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    examDate: v.optional(v.number()), // timestamp
    coverImage: v.optional(v.id("_storage")), // Convex file storage
    authId: v.string(),
    tags: v.optional(v.array(v.string())),
    color: v.optional(v.string()), // hex color or theme color name
    progress: v.optional(v.number()), // 0-100 percentage
    status: v.optional(v.string()), // "active", "completed", "archived"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authId", ["authId"])
    .index("by_status", ["status"])
    .index("by_slug", ["slug"]), 

  // Study Materials with file storage
  studyMaterials: defineTable({
    revisionSetId: v.optional(v.id("revisionSets")), // Made optional for studySet materials
    studySetId: v.optional(v.id("studySets")), // Added for studySet materials
    title: v.string(),
    type: v.string(), // pdf, docx, image, video, text
    fileId: v.optional(v.id("_storage")), // Convex file storage
    fileSize: v.optional(v.number()), // in bytes
    extractedContent: v.optional(v.string()), // text extracted for AI processing
    processedStatus: v.optional(v.string()), // pending, processing, completed, failed
    uploadedAt: v.number(),
    authId: v.string(),
  })
    .index("by_revisionSet", ["revisionSetId"])
    .index("by_studySet", ["studySetId"]) // Added index for studySet
    .index("by_authId", ["authId"]),

  // SmartNotes - AI Generated Notes
  smartNotes: defineTable({
    revisionSetId: v.id("revisionSets"),
    materialId: v.optional(v.id("studyMaterials")),
    title: v.string(),
    content: v.string(), // markdown or rich text
    tags: v.optional(v.array(v.string())),
    generatedBy: v.string(), // AI provider used
    authId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_revisionSet", ["revisionSetId"])
    .index("by_authId", ["authId"]),

  // Flashcards for spaced repetition
  flashcards: defineTable({
    revisionSetId: v.optional(v.id("revisionSets")), // Made optional for studySet flashcards
    studySetId: v.optional(v.id("studySets")), // Added for studySet flashcards
    front: v.string(),
    back: v.string(),
    difficulty: v.optional(v.string()), // easy, medium, hard
    lastReviewed: v.optional(v.number()), // timestamp
    reviewCount: v.optional(v.number()),
    confidenceLevel: v.optional(v.number()), // 1-5 scale
    nextReviewDate: v.optional(v.number()), // spaced repetition algorithm
    tags: v.optional(v.array(v.string())),
    authId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_revisionSet", ["revisionSetId"])
    .index("by_studySet", ["studySetId"]) // Added index for studySet
    .index("by_authId", ["authId"])
    .index("by_nextReview", ["nextReviewDate"]),

  // Quizzes with AI generation
  quizzes: defineTable({
    revisionSetId: v.optional(v.id("revisionSets")),
    courseId: v.optional(v.id("courses")),
    title: v.string(),
    questions: v.array(
      v.object({
        questionId: v.optional(v.string()),
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        explanation: v.optional(v.string()),
        difficulty: v.optional(v.string()),
      }),
    ),
    difficulty: v.optional(v.string()),
    timeLimit: v.optional(v.number()), // in minutes
    generatedBy: v.optional(v.string()), // AI provider
    authId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_revisionSet", ["revisionSetId"])
    .index("by_course", ["courseId"])
    .index("by_authId", ["authId"]),

  // Quiz Attempts/Results
  quizAttempts: defineTable({
    quizId: v.id("quizzes"),
    revisionSetId: v.optional(v.id("revisionSets")),
    authId: v.string(),
    answers: v.array(
      v.object({
        questionId: v.string(),
        selectedAnswer: v.number(),
        isCorrect: v.boolean(),
        timeSpent: v.optional(v.number()), // seconds
      }),
    ),
    score: v.number(), // percentage
    timeSpent: v.number(), // seconds
    completedAt: v.number(),
  })
    .index("by_quiz", ["quizId"])
    .index("by_authId", ["authId"]),

  // Practice Exercises
  practiceExercises: defineTable({
    revisionSetId: v.id("revisionSets"),
    question: v.string(),
    solution: v.string(),
    difficulty: v.optional(v.string()),
    topic: v.optional(v.string()),
    hints: v.optional(v.array(v.string())),
    authId: v.string(),
    createdAt: v.number(),
  })
    .index("by_revisionSet", ["revisionSetId"])
    .index("by_authId", ["authId"]),

  // Past Papers
  pastPapers: defineTable({
    revisionSetId: v.optional(v.id("revisionSets")), // Optional for global past papers
    title: v.string(),
    year: v.optional(v.number()),
    examBoard: v.optional(v.string()),
    fileId: v.id("_storage"), // Convex file storage
    extractedContent: v.optional(v.string()), // Extracted text from PDF for AI processing
    solutions: v.optional(v.array(v.string())), // AI generated or manual solutions
    questions: v.optional(v.array(v.object({
      question: v.string(),
      answer: v.optional(v.string()),
      marks: v.optional(v.number()),
      topic: v.optional(v.string()),
    }))), // Extracted or user-added questions
    processedStatus: v.optional(v.string()), // pending, processing, completed, failed
    uploadedAt: v.number(),
    authId: v.string(),
  })
    .index("by_revisionSet", ["revisionSetId"])
    .index("by_authId", ["authId"]),

  // Study Activity for Streak Tracking
  studyActivity: defineTable({
    authId: v.string(),
    date: v.number(), // Timestamp for the day (midnight)
    activities: v.array(v.string()), // Types of activities: ["flashcard", "quiz", "note"]
    revisionSetId: v.optional(v.id("revisionSets")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authId_date", ["authId", "date"]),

  // Gizmo AI Tutor Chat Messages
  tutorChats: defineTable({
    revisionSetId: v.id("revisionSets"),
    authId: v.string(),
    title: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_revisionSet", ["revisionSetId"])
    .index("by_authId", ["authId"]),

  // Chat Messages for Tutor
  chatMessages: defineTable({
    chatId: v.id("tutorChats"),
    role: v.string(), // user or assistant
    content: v.string(),
    aiProvider: v.optional(v.string()),
    tokensUsed: v.optional(v.number()),
    timestamp: v.number(),
  }).index("by_chat", ["chatId"]),

  // Progress Tracking
  progressTracking: defineTable({
    authId: v.string(),
    revisionSetId: v.id("revisionSets"),
    date: v.number(),
    flashcardsReviewed: v.optional(v.number()),
    quizzesCompleted: v.optional(v.number()),
    exercisesSolved: v.optional(v.number()),
    studyTimeMinutes: v.optional(v.number()),
    performanceScore: v.optional(v.number()),
  })
    .index("by_auth", ["authId"])
    .index("by_revisionSet", ["revisionSetId"]),

  // Session management
  session: defineTable({
    authId: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_authId", ["authId"])
    .index("by_token", ["token"]),

  // Courses
  courses: defineTable({
    title: v.string(),
    description: v.string(),
    authId: v.string(),
    createdAt: v.number(),
  }).index("by_authId", ["authId"]),

  // Study Sets
  studySets: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    authId: v.string(),
    folderId: v.optional(v.id("folders")),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authId", ["authId"])
    .index("by_folder", ["folderId"]),

  // Folders
  folders: defineTable({
    name: v.string(),
    authId: v.string(),
    parentId: v.optional(v.id("folders")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authId", ["authId"])
    .index("by_parent", ["parentId"]),

  // AI Notes
  aiNotes: defineTable({
    studySetId: v.id("studySets"),
    materialId: v.optional(v.id("studyMaterials")),
    title: v.string(),
    content: v.string(),
    summary: v.optional(v.string()),
    keyPoints: v.optional(v.array(v.string())),
    aiProvider: v.string(),
    authId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_studySet", ["studySetId"])
    .index("by_material", ["materialId"])
    .index("by_authId", ["authId"]),

  // Practice Tests
  practiceTests: defineTable({
    studySetId: v.id("studySets"),
    title: v.string(),
    description: v.optional(v.string()),
    questions: v.array(
      v.object({
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        explanation: v.optional(v.string()),
      }),
    ),
    timeLimit: v.optional(v.number()),
    passingScore: v.optional(v.number()),
    authId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_studySet", ["studySetId"])
    .index("by_authId", ["authId"]),

  // Test Attempts
  testAttempts: defineTable({
    testId: v.id("practiceTests"),
    authId: v.string(),
    answers: v.array(
      v.object({
        questionIndex: v.number(),
        selectedAnswer: v.number(),
        isCorrect: v.boolean(),
      }),
    ),
    score: v.number(),
    timeSpent: v.number(),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    startedAt: v.number(),
  })
    .index("by_test", ["testId"])
    .index("by_authId", ["authId"]),

  // AI Chats
  aiChats: defineTable({
    studySetId: v.optional(v.id("studySets")),
    title: v.string(),
    authId: v.string(),
    type: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_authId", ["authId"]),

  // AI Chat Messages
  aiChatMessages: defineTable({
    chatId: v.id("aiChats"),
    role: v.string(),
    content: v.string(),
    aiProvider: v.optional(v.string()),
    attachments: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }).index("by_chat", ["chatId"]),

  // Audio Recaps
  audioRecaps: defineTable({
    studySetId: v.id("studySets"),
    materialId: v.optional(v.id("studyMaterials")),
    title: v.string(),
    audioUrl: v.string(),
    transcript: v.optional(v.string()),
    duration: v.optional(v.number()),
    aiProvider: v.string(),
    authId: v.string(),
    createdAt: v.number(),
  })
    .index("by_studySet", ["studySetId"])
    .index("by_authId", ["authId"]),

  // Video Explainers
  videoExplainers: defineTable({
    studySetId: v.id("studySets"),
    title: v.string(),
    videoUrl: v.string(),
    description: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    duration: v.optional(v.number()),
    aiProvider: v.string(),
    authId: v.string(),
    createdAt: v.number(),
  })
    .index("by_studySet", ["studySetId"])
    .index("by_authId", ["authId"]),

  // Essays
  essays: defineTable({
    studySetId: v.optional(v.id("studySets")),
    title: v.string(),
    content: v.string(),
    prompt: v.optional(v.string()),
    grade: v.optional(v.number()),
    feedback: v.optional(v.string()),
    rubric: v.optional(v.string()),
    aiProvider: v.string(),
    authId: v.string(),
    submittedAt: v.number(),
    gradedAt: v.optional(v.number()),
  }).index("by_authId", ["authId"]),

  // Calendar Events
  calendarEvents: defineTable({
    authId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    studySetId: v.optional(v.id("studySets")),
    startTime: v.number(),
    endTime: v.number(),
    recurring: v.optional(v.boolean()),
    reminder: v.optional(v.number()),
    completed: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authId", ["authId"])
    .index("by_time", ["startTime"]),

  // Lecture Recordings
  lectureRecordings: defineTable({
    studySetId: v.optional(v.id("studySets")),
    title: v.string(),
    audioUrl: v.string(),
    transcript: v.string(),
    duration: v.number(),
    authId: v.string(),
    recordedAt: v.number(),
  }).index("by_authId", ["authId"]),

  // Materials
  materials: defineTable({
    title: v.string(),
    courseId: v.id("courses"),
    authId: v.string(),
    content: v.string(),
    type: v.string(),
    createdAt: v.number(),
  })
    .index("by_course", ["courseId"])
    .index("by_authId", ["authId"]),

  // Vector Embeddings table for RAG
  documentEmbeddings: defineTable({
    documentId: v.id("studyMaterials"),
    revisionSetId: v.optional(v.id("revisionSets")),
    namespace: v.string(),
    chunkIndex: v.number(),
    totalChunks: v.number(),
    text: v.string(),
    embedding: v.array(v.float64()),
    embeddingModel: v.string(),
    userId: v.string(),
    createdAt: v.number(),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["namespace", "revisionSetId"],
    })
    .index("by_document", ["documentId"])
    .index("by_namespace", ["namespace"])
    .index("by_revisionSet", ["revisionSetId"])
    .index("by_user", ["userId"]),

  // Past Paper Embeddings table (separate namespace)
  pastPaperEmbeddings: defineTable({
    pastPaperId: v.id("pastPapers"),
    revisionSetId: v.optional(v.id("revisionSets")),
    namespace: v.string(),
    chunkIndex: v.number(),
    totalChunks: v.number(),
    text: v.string(),
    embedding: v.array(v.float64()),
    embeddingModel: v.string(),
    userId: v.string(),
    createdAt: v.number(),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["namespace", "revisionSetId"],
    })
    .index("by_pastPaper", ["pastPaperId"])
    .index("by_namespace", ["namespace"])
    .index("by_revisionSet", ["revisionSetId"])
    .index("by_user", ["userId"]),

  // RAG Processing Status
  ragProcessingStatus: defineTable({
    documentId: v.id("studyMaterials"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    chunksProcessed: v.number(),
    embeddingsGenerated: v.number(),
    errorMessage: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_document", ["documentId"]),
})
