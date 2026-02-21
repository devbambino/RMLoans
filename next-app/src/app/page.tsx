"use client";

import { usePrivy } from "@privy-io/react-auth";
import { ToastContainer } from "react-toastify";

import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
import Link from "next/link";
function Home() {
  const { ready, authenticated, login } = usePrivy();
  if (!ready) {
    return (
      <section className="flex items-center justify-center h-screen">
        <FullScreenLoader />
      </section>
    );
  }

  return (
    <div className={`h-screen`}>
      {authenticated ? (
        <>
          <div>
            <section className="max-w-5xl mx-auto py-16 px-6">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-extrabold text-gray-400 tracking-tight">
                  Welcome to <span className="text-indigo-400">RapiMoni</span>
                </h2>
                <p className="mt-4 text-lg text-gray-200 max-w-2xl mx-auto">
                  A decentralized platform to manage your capital swiftly and securely.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Borrow Card */}
                <div className="group p-8 bg-gray-950 rounded-3xl border border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-400 mb-3">Borrow</h3>
                  <p className="text-gray-200 leading-relaxed mb-6">
                    Access immediate liquidity by depositing your assets as collateral. Fast loans, no intermediaries, and complete transparency.
                  </p>
                  <Link href="/borrow" className="inline-flex items-center font-semibold text-indigo-600 hover:text-indigo-700">
                    Request Loan <span className="ml-2">→</span>
                  </Link>
                </div>

                {/* Lend Card */}
                <div className="group p-8 bg-gray-950 rounded-3xl border border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-400 mb-3">Lend</h3>
                  <p className="text-gray-200 leading-relaxed mb-6">
                    Make your savings work for you. Provide liquidity to the protocol and generate passive income constantly and securely.
                  </p>
                  <Link href="/lend" className="inline-flex items-center font-semibold text-emerald-600 hover:text-emerald-700">
                    Start Earning <span className="ml-2">→</span>
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : (
        <section className="flex flex-col py-20 h-screen items-center gap-10">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-400 tracking-tight">Welcome to RapiMoni</h2>
            <p className="mt-4 text-lg text-gray-200 max-w-2xl mx-auto">
              A decentralized platform to manage your capital swiftly and securely.
            </p>
          </div>
          <button
            className="bg-gray-100 text-gray-900 cursor-pointer mt-15 w-full max-w-md rounded-full px-4 py-2 font-bold hover:bg-gray-300 transition-colors duration-200 lg:px-8 lg:py-4 lg:text-xl"
            onClick={login}
          >
            Connect Wallet or Create Account
          </button>
        </section>
      )}

      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable={false}
        pauseOnHover
        limit={1}
        aria-label="Toast notifications"
        style={{ top: 58 }}
      />
    </div>
  );
}

export default Home;