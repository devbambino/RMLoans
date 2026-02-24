import Link from 'next/link';
import { HomeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center mt-10 p-4">
            <div className="w-full max-w-md mx-auto p-1 relative z-10">
                <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-[#264c73] shadow-2xl backdrop-blur-xl">
                    <div className="absolute top-0 left-0 w-full h-32 pointer-events-none" />

                    <div className="relative p-8 text-center">
                        <div className="bg-[#0a0a0a] w-20 h-20 mx-auto rounded-full flex items-center justify-center border border-[#4fe3c3] mb-6">
                            <ExclamationTriangleIcon className="w-10 h-10 text-[#4fe3c3]" />
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2 pb-2 border-b-4 border-[#264c73] inline-block">
                            Page Not Found
                        </h2>

                        <p className="text-gray-200 mt-4 mb-8 text-sm leading-relaxed">
                            It seems the page you're looking for hasn't been found or the address is incorrect. Return to the main vault.
                        </p>

                        <Link
                            href="/"
                            className="flex items-center justify-center w-full gap-2 cursor-pointer py-4 px-6 bg-[#264c73] hover:bg-[#4fe3c3] text-white hover:text-[#0a0a0a] font-bold rounded-xl transition-all transform hover:-translate-y-1"
                        >
                            <HomeIcon className="w-5 h-5" />
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}