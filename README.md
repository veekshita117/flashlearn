# FlashLearn

FlashLearn is an AI-powered study platform designed to help students learn more effectively. The application generates flashcards and study material from user topics, includes a Pomodoro focus timer, and tracks user progress through an XP-based leaderboard system.

---

## Features

- AI-generated flashcards
- Study summaries
- Pomodoro focus timer
- XP leaderboard system
- User authentication
- MongoDB database integration

---

## Application Flow

1. User registers or logs into the platform.
2. User enters a study topic.
3. Frontend sends the topic to the backend.
4. Backend requests flashcards from the AI API.
5. AI returns generated questions and answers.
6. Backend stores flashcards in MongoDB.
7. Frontend displays flashcards to the user.
8. Timer completion updates user XP and leaderboard rankings.

---

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- TypeScript

### Backend
- Node.js
- Express.js
- TypeScript

### Database
- MongoDB
- Mongoose

### AI Integration
- Google Gemini API

---

## Local Setup

### Prerequisites

- Node.js
- MongoDB URI
- Gemini API Key

---

## Clone Repository

```bash
git clone https://github.com/veekshita117/flashlearn.git
cd flashlearn