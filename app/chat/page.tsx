"use client";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4 md:p-6 text-sidebar-foreground">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Walmart Assistant</h1>
        <p className="text-muted-foreground">Powered by LangChain & Gemini AI</p>
      </header>

      <div className="flex-1 overflow-y-auto mb-6 p-4 rounded-xl bg-card border shadow-sm flex items-center justify-center">
        <p className="text-muted-foreground text-center max-w-sm">
          The generic chat page is disabled. Please use the specific Visually Impaired or Hearing Impaired assistant pages.
        </p>
      </div>
    </div>
  );
}
