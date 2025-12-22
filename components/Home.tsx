'use client'
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const HomeComponent = () => {
    const [message, setMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [message]);

    return (
        <div className="w-full max-w-6xl">
            <div className="bg-[#171717] rounded-2xl border border-[#1a1a1a] focus-within:border-[#2a2a2a] transition-colors shadow-lg">
                <div className="flex items-center gap-4 px-6 py-4">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Get Started!"
                        className="flex-1 bg-transparent px-3 py-3 text-gray-100 placeholder-gray-500 resize-none outline-none text-base leading-relaxed min-h-10 max-h-[600px] w-full"
                        rows={1}
                    />
                    <Link href="/editor">
                    <button 
                    className="w-10 h-10 rounded-xl bg-linear-to-br from-gray-100 to-white hover:from-white hover:to-gray-50 flex items-center justify-center transition-all shadow-md hover:shadow-lg shrink-0"
                    >
                        <span className="text-black text-lg font-bold">↑</span>
                    </button>
                    </Link>    
                </div>
            </div>
        </div>
    )
}

export default HomeComponent;