"use client";

import { useState } from "react";

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return; // Basic validation
    setIsSubmitting(true);
    
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, message, name }),
      });
      
      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          // Reset form after closing
          setTimeout(() => {
            setRating(0);
            setMessage("");
            setName("");
            setIsSuccess(false);
          }, 300);
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to submit feedback", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center gap-2 rounded-full bg-[#FF6B2B] px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#ff5500]"
      >
        <span>💬</span> Feedback
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white"
            >
              ✕
            </button>
            
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="mb-4 text-4xl">🙏</span>
                <h3 className="text-xl font-bold text-white">Thank you!</h3>
                <p className="mt-2 text-zinc-400">Your feedback helps us improve.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 className="mb-1 text-xl font-bold text-white">Share Your Feedback</h3>
                <p className="mb-6 text-sm text-zinc-400">Completely optional — takes 30 seconds</p>
                
                <div className="mb-6 flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="text-3xl transition-colors focus:outline-none"
                    >
                      <span className={(hoverRating || rating) >= star ? "text-[#FF6B2B]" : "text-zinc-800"}>
                        ★
                      </span>
                    </button>
                  ))}
                </div>
                
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What did you like? What can we improve?"
                  className="mb-4 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white placeholder-zinc-500 focus:border-[#FF6B2B] focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]"
                  rows={4}
                  required
                />
                
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="mb-6 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white placeholder-zinc-500 focus:border-[#FF6B2B] focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]"
                />
                
                <button
                  type="submit"
                  disabled={rating === 0 || isSubmitting}
                  className="w-full rounded-xl bg-[#FF6B2B] py-3 text-sm font-bold text-white transition-colors hover:bg-[#ff5500] disabled:opacity-50"
                >
                  {isSubmitting ? "Sending..." : "Send Feedback →"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
