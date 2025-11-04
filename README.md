# SpecBot - Electrical Specification Q&A

An AI-powered chatbot for analyzing electrical specifications using Next.js, OpenAI, and PDF.js.

## Features

- 📄 **PDF Upload & Processing**: Upload electrical specification PDFs and extract text for analysis
- 💬 **AI-Powered Chat**: Ask questions about your specifications and get intelligent answers
- 🔗 **Smart References**: AI responses include references to specific pages in the PDF
- 📍 **PDF Navigation**: Click on references to automatically navigate to the relevant page
- 💾 **Conversation History**: All conversations are saved and searchable
- 🌓 **Dark Mode**: Full dark mode support
- 🔍 **Vector Search**: Uses OpenAI embeddings for semantic search across documents

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (via Prisma ORM)
- **AI**: OpenAI GPT-4 and embeddings
- **PDF Processing**: pdf-parse for text extraction
- **State Management**: Zustand
- **PDF Viewing**: Native browser PDF viewer

### Database Schema
- **Documents**: Stores uploaded PDF metadata
- **DocumentChunks**: Text chunks with embeddings for semantic search
- **Conversations**: Chat sessions linked to documents
- **Messages**: User and assistant messages
- **References**: Links messages to specific document chunks/pages

### Key Components
1. **Header**: Navigation and upload button
2. **Sidebar**: Conversation history with search and date grouping
3. **ChatArea**: Message interface with reference display
4. **PDFViewer**: Embedded PDF viewer with page navigation
5. **UploadModal**: File upload interface with drag & drop

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   The `.env.local` file is already configured with your OpenAI API key:
   ```
   DATABASE_URL="file:./dev.db"
   OPENAI_API_KEY="your-key-here"
   MAX_FILE_SIZE=10485760
   UPLOAD_DIR="./uploads"
   ```

3. **Initialize Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Create Upload Directory**
   ```bash
   mkdir uploads
   ```

### Running the Application

1. **Development Mode**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

2. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## Usage Guide

### Uploading a Document
1. Click "Upload New Specification" button in the header
2. Drag & drop a PDF file or click to browse
3. Click "Upload" - the system will:
   - Extract text from the PDF
   - Generate embeddings for semantic search
   - Create a new conversation
   - Display the PDF in the viewer

### Asking Questions
1. Type your question in the input field at the bottom
2. Press Enter or click Send
3. The AI will:
   - Search for relevant content using embeddings
   - Generate a response with citations
   - Show references to specific pages

### Navigating References
1. Click on any reference in the AI's response
2. The PDF viewer will automatically jump to that page
3. The page number is highlighted in the PDF viewer

### Managing Conversations
- **Search**: Use the search bar in the sidebar to find conversations
- **New Conversation**: Click the + icon to start a new conversation
- **Switch Conversations**: Click on any conversation in the sidebar
- **History Groups**: Conversations are grouped by date (Today, Yesterday, etc.)

## How It Works

### RAG (Retrieval-Augmented Generation) Flow

1. **Document Processing**
   - PDF is uploaded and saved to the server
   - Text is extracted and split into chunks (~1000 characters)
   - Each chunk is embedded using OpenAI's text-embedding-3-small model
   - Embeddings are stored in the database

2. **Question Answering**
   - User question is embedded using the same model
   - Cosine similarity is calculated between question and all chunks
   - Top 5 most relevant chunks are retrieved
   - Chunks are sent to GPT-4 as context
   - AI generates answer with numbered citations
   - Citations are mapped back to specific pages

3. **Reference Navigation**
   - Each reference includes the chunk ID and page number
   - Clicking a reference updates the PDF viewer URL with #page=X
   - Browser native PDF viewer navigates to that page

## API Endpoints

- `POST /api/upload` - Upload and process a PDF document
- `POST /api/chat` - Send a message and get AI response
- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create a new conversation
- `GET /api/conversations/[id]/messages` - Get messages for a conversation
- `GET /api/documents/[id]/pdf` - Serve PDF file

## Database Migrations

To modify the database schema:
1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` (for development)
3. Or `npx prisma migrate dev` (for production-ready migrations)

## Customization

### Changing AI Model
Edit `lib/openai.ts`:
```typescript
model: 'gpt-4o-mini' // Change to gpt-4, gpt-3.5-turbo, etc.
```

### Adjusting Chunk Size
Edit `lib/pdf.ts`:
```typescript
chunkText(text, maxChunkSize: 1000, overlap: 200)
```

### Changing Number of Retrieved Chunks
Edit `app/api/chat/route.ts`:
```typescript
.slice(0, 5) // Change to retrieve more or fewer chunks
```

## Production Deployment

### Switch to PostgreSQL
1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `.env.local` with PostgreSQL connection string
3. Run migrations

### Deploy to Vercel
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

**Note**: For production, consider:
- Using cloud storage (S3, Cloudinary) for PDFs instead of local filesystem
- Implementing user authentication
- Adding rate limiting
- Using a job queue for PDF processing
- Implementing vector database (Pinecone, Weaviate) for better scaling

## Troubleshooting

### PDF Not Displaying
- Ensure the PDF is valid and not password-protected
- Check browser console for errors
- Verify file was uploaded successfully

### AI Not Responding
- Check OpenAI API key is valid
- Verify API has sufficient credits
- Check network tab for API errors

### Slow Upload
- Large PDFs take time to process
- Embeddings generation can take 1-2 minutes for large documents
- Consider implementing background job processing

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
