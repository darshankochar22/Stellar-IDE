"use client";

import { useRef, useEffect } from "react";

interface HeroSectionProps {
  promptValue: string;
  onPromptChange: (value: string) => void;
}

export function HeroSection({ promptValue, onPromptChange }: HeroSectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [promptValue]);

  return (
    <div className="relative min-h-screen w-full dark:bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-3xl mx-auto text-center">
        <h1 className="text-[2rem] font-normal text-[#ececec] mb-8 tracking-tight">
          Start your Journey here
        </h1>

        {/* Prompt Bar */}
        <div className="w-full mb-3">
          <div className="bg-[#2f2f2f] rounded-[24px] shadow-[0_0_0_1px_rgba(0,0,0,0.1)]">
            <div className="flex items-end gap-2 px-4 py-4">
              <textarea
                ref={textareaRef}
                value={promptValue}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="Message ChatGPT"
                className="flex-1 bg-transparent text-[#ececec] placeholder-[#676767] resize-none outline-none text-[15px] leading-6 min-h-[24px] max-h-[200px] w-full"
                rows={1}
              />
              <button className="shrink-0 w-8 h-8 rounded-lg bg-[#676767] hover:bg-[#7a7a7a] flex items-center justify-center transition-colors duration-150">
                <svg
                  className="w-5 h-5 text-black"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M7 11l5-5m0 0l5 5m-5-5v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 flex-wrap pt-4">
          <button className="px-3 py-2 text-[13px] font-normal text-[#b4b4b4] bg-[#2f2f2f] rounded-full hover:bg-[#3f3f3f] transition-colors duration-150">
            Search
          </button>
          <button className="px-3 py-2 text-[13px] font-normal text-[#b4b4b4] bg-[#2f2f2f] rounded-full hover:bg-[#3f3f3f] transition-colors duration-150">
            Talk to Code
          </button>
          <button className="px-3 py-2 text-[13px] font-normal text-[#b4b4b4] bg-[#2f2f2f] rounded-full hover:bg-[#3f3f3f] transition-colors duration-150">
            Research your Idea
          </button>
          <button className="px-3 py-2 text-[13px] font-normal text-[#b4b4b4] bg-[#2f2f2f] rounded-full hover:bg-[#3f3f3f] transition-colors duration-150">
            More
          </button>
        </div>
      </div>

    </div>
  );
}

export default HeroSection;