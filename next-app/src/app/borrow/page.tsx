import PrestamoRapido from "@/components/PrestamoRapido";

export default function Page() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24 bg-[#050505]">
            <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
                {/* Background Blobs for Premium Feel */}
                <div className="fixed left-0 top-0 flex h-full w-full justify-center overflow-hidden pointer-events-none">
                    <div className="relative flex w-full h-full max-w-[100vw] items-center justify-center">
                        <div className="absolute top-[20%] left-[10%] h-[300px] w-[300px] rounded-full bg-purple-600/20 blur-[100px]" />
                        <div className="absolute bottom-[20%] right-[10%] h-[250px] w-[250px] rounded-full bg-cyan-500/20 blur-[100px]" />
                    </div>
                </div>
            </div>

            <div className="relative z-20 flex flex-col items-center gap-8 w-full py-18 mt-5 sm:mt-0 sm:py-5">
                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500">
                        RapiMoni Préstamos
                    </h1>
                    <p className="text-gray-400 max-w-lg mx-auto text-lg">
                        Préstamos instantáneos en MXNB usando tu USDC como colateral.
                        <br />
                    </p>
                </div>

                <PrestamoRapido />

                <div className="text-xs text-gray-600 mt-8 max-w-md text-center">
                    <p>Al depositar, aceptas los términos y condiciones del protocolo.</p>
                    <p>LTV Máximo: 77% | Oracle: Chainlink</p>
                </div>
            </div>
        </main>
    );
}
