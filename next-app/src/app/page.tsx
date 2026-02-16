"use client";

import { usePrivy } from "@privy-io/react-auth";
import { ToastContainer } from "react-toastify";

import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
function Home() {
  const { ready, authenticated, login } = usePrivy();
  if (!ready) {
    return <FullScreenLoader />;
  }

  return (
    <div className={`bg-gray-950 h-screen`}>
      {authenticated ? (
        <></>
      ) : (
        <section className="flex h-screen bg-transparent items-center justify-center">
        <button
              className="bg-gray-100 cursor-pointer mt-15 w-full max-w-md rounded-full px-4 py-2 font-bold hover:bg-gray-300 transition-colors duration-200 lg:px-8 lg:py-4 lg:text-xl"
              onClick={() => {
                login();
                setTimeout(() => {
                  (document.querySelector('input[type="email"]') as HTMLInputElement)?.focus();
                }, 150);
              }}
            >
              Get started
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