"use client";

import { useState, useEffect } from "react";
import { useMorphoLoan } from "../hooks/useMorphoLoan";
import { usePrivy } from "@privy-io/react-auth";
import { ChevronRightIcon, CheckCircleIcon, ArrowPathIcon, BanknotesIcon } from "@heroicons/react/24/outline";

export default function PrestamoRapido() {
    const { authenticated, login } = usePrivy();
    const { loading, step, error, txHash, usdcBalance, executeZale, getSimulatedDeposit } = useMorphoLoan();

    const [borrowAmount, setBorrowAmount] = useState("");
    const [requiredDeposit, setRequiredDeposit] = useState("0.00");

    useEffect(() => {
        if (borrowAmount) {
            const deposit = getSimulatedDeposit(borrowAmount);
            setRequiredDeposit(deposit);
        } else {
            setRequiredDeposit("0.00");
        }
    }, [borrowAmount, getSimulatedDeposit]);

    const handleBorrow = async () => {
        if (!borrowAmount || parseFloat(borrowAmount) <= 0) return;
        await executeZale(borrowAmount);
    };

    // Steps for the Stepper
    const steps = [
        "Approving USDC",
        "Supplying to Vault",
        "Approving mUSDC",
        "Wrapping to WmUSDC",
        "Approving Collateral",
        "Supplying Collateral",
        "Borrowing MXNB"
    ];

    return (
        <div className="w-full max-w-md mx-auto p-1">
            <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl backdrop-blur-xl">
                {/* Header Background Gradient */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-transparent pointer-events-none" />

                <div className="relative p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                Prestamo Rápido
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Obtén MXNB al instante</p>
                        </div>
                        <div className="p-3 rounded-full bg-white/5 border border-white/10">
                            <BanknotesIcon className="w-6 h-6 text-[#50e2c3]" />
                        </div>
                    </div>

                    {!authenticated ? (
                        <div className="text-center py-12">
                            <p className="text-gray-400 mb-6">Conecta tu wallet para comenzar</p>
                            <button
                                onClick={login}
                                className="w-full py-3 px-4 bg-gradient-to-r from-[#50e2c3] to-cyan-500 hover:from-[#40d2b3] hover:to-cyan-400 text-black font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
                            >
                                Conectar Wallet
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Input Section */}
                            <div className="space-y-6 py-10">
                                <div className="group">
                                    <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                                        ¿Cuánto MXNB quieres recibir?
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={borrowAmount}
                                            onChange={(e) => setBorrowAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-[#50e2c3]/50 focus:ring-1 focus:ring-[#50e2c3]/50 transition-all placeholder:text-gray-600"
                                            disabled={loading}
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-400">MXNB</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Simulation Output */}
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Depósito Requerido (Est.)</span>
                                        <span className="text-white font-mono font-medium">{requiredDeposit} USDC</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Saldo Disponible</span>
                                        <span className="text-gray-300 font-mono">{usdcBalance} USDC</span>
                                    </div>
                                    {parseFloat(usdcBalance) < parseFloat(requiredDeposit || "0") && (
                                        <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                            ⚠️ Saldo insuficiente
                                        </div>
                                    )}
                                </div>

                                {/* Progress Stepper (Visible when loading) */}
                                {loading && (
                                    <div className="space-y-3 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex justify-between text-xs text-gray-400 uppercase tracking-widest mb-1">
                                            <span>Procesando...</span>
                                            <span>{Math.min(step, 7)} / 7</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#50e2c3] to-cyan-500 transition-all duration-500 ease-out"
                                                style={{ width: `${(step / 7) * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-center text-sm text-[#50e2c3] font-medium animate-pulse">
                                            {step === 0 ? "Iniciando..." :
                                                step > 7 ? "¡Listo!" :
                                                    steps[step - 1]}
                                        </p>
                                    </div>
                                )}

                                {/* Error Message */}
                                {error && (
                                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                                        <p className="font-semibold mb-1">Error</p>
                                        {error}
                                    </div>
                                )}

                                {/* Success Message */}
                                {step === 8 && !loading && (
                                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-200 text-sm text-center">
                                        <CheckCircleIcon className="w-8 h-8 mx-auto mb-2 text-green-400" />
                                        <p className="font-bold text-lg">¡Préstamo Exitoso!</p>
                                        <p className="opacity-80">Has estibido {borrowAmount} MXNB.</p>
                                    </div>
                                )}

                                {/* Action Button */}
                                <button
                                    onClick={handleBorrow}
                                    disabled={loading || !borrowAmount || parseFloat(borrowAmount) <= 0 || parseFloat(usdcBalance) < parseFloat(requiredDeposit)}
                                    className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg 
                    ${loading
                                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                            : (parseFloat(usdcBalance) < parseFloat(requiredDeposit || "0"))
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-[#50e2c3] to-cyan-600 hover:from-[#40d2b3] hover:to-cyan-500 text-black shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-0.5'
                                        }
                  `}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                            Procesando...
                                        </span>
                                    ) : step === 8 ? (
                                        "Solicitar Otro Préstamo"
                                    ) : (
                                        "Depositar y Tomar Préstamo"
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
