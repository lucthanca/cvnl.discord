-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "discordId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "cvnlUserId" TEXT NOT NULL,
    "cvnlUserName" TEXT NOT NULL,
    "cvnlUserGender" TEXT,
    "cvnlUserJob" INTEGER,
    "cvnlUserAge" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "oauth_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "discordId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_channels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "discordId" TEXT NOT NULL,
    "cvnlUserId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_channels_discordId_cvnlUserId_fkey" FOREIGN KEY ("discordId", "cvnlUserId") REFERENCES "users" ("discordId", "cvnlUserId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_threads" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "chatId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "threadName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cvnlUserId" TEXT NOT NULL,
    "reOpenCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "chat_threads_discordId_cvnlUserId_fkey" FOREIGN KEY ("discordId", "cvnlUserId") REFERENCES "users" ("discordId", "cvnlUserId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "thread_messages" (
    "threadId" TEXT NOT NULL,
    "discordMsgId" TEXT NOT NULL,
    "cvnlMsgId" TEXT NOT NULL,

    PRIMARY KEY ("discordMsgId", "cvnlMsgId"),
    CONSTRAINT "thread_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "chat_threads" ("threadId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_discordId_cvnlUserId_key" ON "users"("discordId", "cvnlUserId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_sessions_discordId_key" ON "oauth_sessions"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "user_channels_channelId_key" ON "user_channels"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "user_channels_discordId_cvnlUserId_key" ON "user_channels"("discordId", "cvnlUserId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_threads_threadId_key" ON "chat_threads"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_threads_chatId_cvnlUserId_key" ON "chat_threads"("chatId", "cvnlUserId");

-- CreateIndex
CREATE UNIQUE INDEX "thread_messages_discordMsgId_key" ON "thread_messages"("discordMsgId");

-- CreateIndex
CREATE UNIQUE INDEX "thread_messages_threadId_cvnlMsgId_key" ON "thread_messages"("threadId", "cvnlMsgId");
