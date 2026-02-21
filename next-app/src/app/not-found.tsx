import Link from 'next/link';
import { HomeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
    return (
        <>

            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md mx-auto p-1 relative z-10">
                <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl backdrop-blur-xl">

                    <div className="absolute flex flex-col items-center flex-center top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-transparent pointer-events-none" />

                    <div className="relative p-8 text-center">
                        <div className=" bg-red-500/10 w-fit mx-auto h-fit p-5 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 border border-red-500/20">
                            <ExclamationTriangleIcon className="w-12 h-12 text-red-400" />
                        </div>


                        <h2 className="text-xl font-semibold text-white my-4">
                            Page Not Found
                        </h2>

                        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                            It seems the page you're looking for hasn't been found or the address is incorrect. Return to the main vault.
                        </p>

                        <Link
                            href="/"
                            className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-gradient-to-r from-[#50e2c3] to-cyan-500 hover:from-[#40d2b3] hover:to-cyan-400 text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/30 transform hover:-translate-y-1"
                        >
                            <HomeIcon className="w-5 h-5" />
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}