"use client";

import { useState, useEffect } from "react";
import { useMorphoLoan } from "../hooks/useMorphoLoan";
import { usePrivy } from "@privy-io/react-auth";
import { CheckCircleIcon, ArrowPathIcon, BanknotesIcon, CircleStackIcon, LockClosedIcon, CreditCardIcon, ChartBarIcon } from "@heroicons/react/24/outline";

export default function PrestamoRapido() {
    const { authenticated, login } = usePrivy();
    const { loading, step, error, txHash, usdcBalance, mxnbBalance, collateralBalance, borrowBalance, marketLiquidity, marketAPR, totalRepaidAmount, userPaidSubsidyInUSDC, userInterestInMxnb, executeZale, executeRepayAndWithdraw, getSimulatedDeposit, resetState } = useMorphoLoan();

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
    //pasos para el stepper
    const steps = [
        "Aprobando USDC",
        "Depositando en Bóveda",
        "Aprobando mUSDC",
        "Envolviendo a WmUSDC",
        "Aprobando Colateral",
        "Depositando Colateral",
        "Solicitando MXNB"
    ];

    const getRepayStepLabel = (s: number) => {
        switch (s) {
            case 11: return "Verificando MXNB...";
            case 12: return "Pagando Deuda...";
            case 13: return "Retirando Colateral...";
            case 14: return "Des-envolviendo WmUSDC...";
            case 15: return "Recuperando USDC...";
            case 16: return "¡Finalizado!";
            default: return "Procesando...";
        }
    };

    // Derived state for validation
    const isExceedingLiquidity = borrowAmount && parseFloat(borrowAmount) > parseFloat(marketLiquidity);
    const isInsufficientBalance = parseFloat(usdcBalance) < parseFloat(requiredDeposit || "0");

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
                            {/* Balances Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-2 p-2 mt-16 bg-white/5 rounded-xl border border-white/10">
                                {/* Row 1 */}
                                <div className="text-center">
                                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center justify-center gap-1">
                                        <CircleStackIcon className="w-3 h-3" /> USDC
                                    </div>
                                    <div className="font-mono text-xs text-white truncate">{usdcBalance} USDC</div>
                                </div>
                                <div className="text-center border-l border-white/5">
                                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center justify-center gap-1">
                                        <BanknotesIcon className="w-3 h-3 text-[#50e2c3]" /> MXNB
                                    </div>
                                    <div className="font-mono text-xs text-[#50e2c3] truncate">{mxnbBalance} MXNB</div>
                                </div>
                                <div className="text-center border-l border-white/5">
                                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center justify-center gap-1">
                                        <LockClosedIcon className="w-3 h-3 text-purple-400" /> Colateral
                                    </div>
                                    <div className="font-mono text-xs text-purple-300 truncate">{collateralBalance} WmUSDC</div>
                                </div>

                                {/* Row 2 (New Stats) */}
                                <div className="col-span-3 h-px bg-white/5 my-1" />

                                <div className="text-center">
                                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center justify-center gap-1">
                                        <CreditCardIcon className="w-3 h-3 text-red-400" /> Deuda Actual
                                    </div>
                                    <div className="font-mono text-xs text-red-300 truncate">{borrowBalance} MXNB</div>
                                </div>
                                <div className="text-center border-l border-white/5">
                                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center justify-center gap-1">
                                        <ChartBarIcon className="w-3 h-3 text-yellow-400" /> Tasa (APR)
                                    </div>
                                    <div className="font-mono text-xs text-yellow-300 truncate">{marketAPR}%</div>
                                </div>
                                <div className="text-center border-l border-white/5">
                                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center justify-center gap-1">
                                        <CircleStackIcon className="w-3 h-3 text-blue-400" /> Liquidez
                                    </div>
                                    <div className="font-mono text-xs text-blue-300 truncate">{marketLiquidity} MXNB</div>
                                </div>
                            </div>

                            {step === 8 ? (
                                <div className="py-8 text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/20 border border-green-500/20">
                                        <CheckCircleIcon className="w-10 h-10 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">¡Operación Exitosa!</h3>
                                        <p className="text-gray-400">
                                            Recibiste <span className="text-[#50e2c3] font-bold text-lg">{borrowAmount} MXNB</span>
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setBorrowAmount("");
                                            resetState();
                                        }}
                                        className="w-full cursor-pointer py-4 px-6 bg-gradient-to-r from-[#50e2c3] to-cyan-500 hover:from-[#40d2b3] hover:to-cyan-400 text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/30 transform hover:-translate-y-1"
                                    >
                                        Realizar otra operación
                                    </button>
                                </div>
                            ) : step === 16 ? (
                                <div className="py-8 text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                                    <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20 border border-purple-500/20">
                                        <CheckCircleIcon className="w-10 h-10 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">¡Pago Exitoso!</h3>
                                        <div className="text-sm bg-white/5 p-4 rounded-lg space-y-2 text-left">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Total Pagado:</span>
                                                <span className="text-white font-mono">{totalRepaidAmount || "Calculando..."} MXNB</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Estado:</span>
                                                <span className="text-green-400">Deuda Saldada</span>
                                            </div>
                                            {parseFloat(userPaidSubsidyInUSDC || "0") > 0 && (
                                                <>
                                                    <div className="h-px bg-white/10 my-2" />
                                                    <div className="text-center">
                                                        <div className="text-xs text-purple-300 font-semibold mb-2 flex items-center justify-center gap-1">
                                                            💰 Hemos subsidiado el interes del prestamo!!!
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Subsidio recibido:</span>
                                                        <span className="text-purple-300 font-mono">{userPaidSubsidyInUSDC} USDC</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Equivalente en MXNB:</span>
                                                        <span className="text-purple-300 font-mono">{userInterestInMxnb} MXNB</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setBorrowAmount("");
                                            resetState();
                                        }}
                                        className="w-full cursor-pointer py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-purple-500/30 transform hover:-translate-y-1"
                                    >
                                        Volver al Inicio
                                    </button>
                                </div>
                            ) : (
                                /* Input Section */
                                <div className="space-y-6 py-6">
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
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-[#50e2c3]/50 focus:ring-1 focus:ring-[#50e2c3]/50 transition-all placeholder:text-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                        {/* Validation Errors */}
                                        {isInsufficientBalance && (
                                            <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                                ⚠️ Saldo insuficiente
                                            </div>
                                        )}
                                        {isExceedingLiquidity && (
                                            <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                                ⚠️ Liquidez insuficiente en el mercado
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Stepper (Visible when loading) */}
                                    {loading && (
                                        <div className="space-y-3 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            {step < 10 ? (
                                                <>
                                                    <div className="flex justify-between text-xs text-gray-400 uppercase tracking-widest mb-1">
                                                        <span>Procesando Préstamo...</span>
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
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between text-xs text-gray-400 uppercase tracking-widest mb-1">
                                                        <span>Procesando Pago...</span>
                                                        <span>{Math.min(step - 10, 5)} / 5</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-500 ease-out"
                                                            style={{ width: `${((step - 10) / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-center text-sm text-purple-400 font-medium animate-pulse">
                                                        {getRepayStepLabel(step)}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {error && (
                                        <div className="p-4 text-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                                            <p className="font-semibold text-center mb-1">Ha ocurrido un error al solicitar el préstamo</p>
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
                                        disabled={loading || !borrowAmount || parseFloat(borrowAmount) <= 0 || isInsufficientBalance || isExceedingLiquidity}
                                        className={`w-full cursor-pointer py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg 
        ${(loading || !borrowAmount || parseFloat(borrowAmount) <= 0)
                                                ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-white/5'
                                                : (isInsufficientBalance || isExceedingLiquidity)
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

                                    {/* Repay Button - Only show if user has debt or collateral */}
                                    {(!loading && (parseFloat(borrowBalance) > 0 || parseFloat(collateralBalance) > 0)) && (
                                        <button
                                            onClick={executeRepayAndWithdraw}
                                            className="w-full mt-4 cursor-pointer py-3 px-6 rounded-xl font-bold text-sm text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 transition-all shadow-lg hover:shadow-purple-500/20"
                                        >
                                            Pagar Todo y Retirar
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div >
        </div >
    );
}
