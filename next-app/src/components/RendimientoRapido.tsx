"use client";

import { useState } from "react";
import { useMorphoLend } from "../hooks/useMorphoLend";
import { usePrivy } from "@privy-io/react-auth";
import {
    CheckCircleIcon,
    ArrowPathIcon,
    BanknotesIcon,
    ChartBarIcon,
    CircleStackIcon,
    WalletIcon,
    CurrencyDollarIcon
} from "@heroicons/react/24/outline";
import BalancesGrid, { BalanceItem } from "./BalancesGrid";
import Input from "./Input";
import Button from "./Button";

export default function RendimientoRapido() {
    const { authenticated, login } = usePrivy();
    const {
        loading,
        step,
        error,
        mxneBalance,
        vaultAssetsBalance,
        tvl,
        apy,
        withdrawnAmount,
        yieldEarned,
        executeDeposit,
        executeWithdraw,
        refreshData,
        resetState
    } = useMorphoLend();

    const [depositAmount, setDepositAmount] = useState("");

    const handleDeposit = async () => {
        if (!depositAmount || parseFloat(depositAmount) <= 0) return;
        await executeDeposit(depositAmount);
        setDepositAmount("");
    };

    const handleWithdrawAll = async () => {
        await executeWithdraw(0n, true);
    };

    const handleReset = () => {
        setDepositAmount("");
        resetState();
    };

    // Steps mapping
    const getStepLabel = (s: number) => {
        switch (s) {
            case 1: return "Approving MXNe...";
            case 2: return "Depositing in Vault...";
            case 3: return "Confirming...";
            case 11: return "Withdrawing Liquidity...";
            default: return "Processing...";
        }
    };

    // Derived states
    const hasLiquidity = parseFloat(vaultAssetsBalance) > 0;
    const isInsufficientBalance = depositAmount && parseFloat(depositAmount) > parseFloat(mxneBalance);

    const balanceRows: BalanceItem[][] = [
        [
            { label: "Your Pesos", value: `${mxneBalance} MXNe`, icon: WalletIcon, highlightValue: true },
            { label: "Your Deposits", value: `${vaultAssetsBalance} MXNe`, icon: CircleStackIcon }
        ],

        [
            { label: "APY", value: `${apy}%`, icon: ChartBarIcon },
            { label: "TVL", value: `${tvl} MXNe`, icon: BanknotesIcon }
        ]
    ];

    return (
        <div className="w-full max-w-md mx-auto p-1">
            <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-[#264c73] shadow-2xl backdrop-blur-xl">
                {/* Header Background Gradient */}
                <div className="absolute top-0 left-0 w-full h-28 pointer-events-none" />

                <div className="relative p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl w-fit mb-2 border-b-4 border-[#264c73] font-bold text-white">
                                MXNe Yield
                            </h2>
                            <p className="text-sm font-bold text-[#4fe3c3] mt-1">Provide liquidity and earn interest</p>
                        </div>
                        <div className="p-3 rounded-full bg-[#0a0a0a] border border-[#264c73]">
                            <ChartBarIcon className="w-6 h-6 text-[#4fe3c3]" />
                        </div>
                    </div>

                    {!authenticated ? (
                        <div className="text-center py-12">
                            <p className="text-gray-200 mb-6">Connect your wallet to get started</p>
                            <Button onClick={login}>
                                Connect Wallet
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Balances Grid */}
                            <BalancesGrid rows={balanceRows} columns={2} className="mb-6 mt-14" />

                            {/* Main Content Area */}
                            {step === 4 && !loading ? (
                                /* Success Screen (Deposit) */
                                <div className="py-8 text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                                    <div className="w-20 h-20 bg-[#0a0a0a] rounded-full flex items-center justify-center mx-auto border border-[#4fe3c3]">
                                        <CheckCircleIcon className="w-10 h-10 text-[#4fe3c3]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Deposit Successful!</h3>
                                        <p className="text-gray-200">
                                            Your liquidity has been successfully added.
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handleReset}
                                        className="transform hover:-translate-y-1"
                                    >
                                        Make Another Deposit
                                    </Button>
                                </div>
                            ) : step === 12 && !loading ? (
                                /* Success Screen (Withdrawal) */
                                <div className="py-8 text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                                    <div className="w-20 h-20 bg-[#0a0a0a] rounded-full flex items-center justify-center mx-auto border border-[#4fe3c3]">
                                        <CheckCircleIcon className="w-10 h-10 text-[#4fe3c3]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Withdrawal Successful!</h3>
                                        <div className="text-sm bg-[#0a0a0a] border border-[#264c73] p-4 rounded-lg space-y-2 text-left">
                                            <div className="flex justify-between">
                                                <span className="text-gray-200">Total Withdrawn:</span>
                                                <span className="text-white font-mono">{withdrawnAmount} MXNe</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleReset}
                                        className="transform hover:-translate-y-1"
                                    >
                                        Back to Home
                                    </Button>
                                </div>
                            ) : (
                                /* Input Section */
                                <div className="space-y-6 py-2">
                                    {!loading && (
                                        <Input
                                            label="How much MXNe do you want to deposit?"
                                            symbol="MXNE"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            onMaxClick={() => setDepositAmount(mxneBalance)}
                                            errorMessage={isInsufficientBalance ? "Insufficient balance" : null}
                                        />
                                    )}

                                    {/* Progress Stepper */}
                                    {loading && (
                                        <div className="space-y-3 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex justify-between text-xs text-gray-200 uppercase tracking-widest mb-1">
                                                <span>
                                                    {step >= 11 ? "Processing Withdrawal..." : "Processing Deposit..."}
                                                </span>
                                                <span>
                                                    {step >= 11 ? "1 / 1" : `${Math.min(step, 3)} / 3`}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-[#264c73] rounded-full overflow-hidden">
                                                {step >= 11 ? (
                                                    <div
                                                        className="h-full bg-[#4fe3c3] transition-all duration-500 ease-out animate-pulse"
                                                        style={{ width: "100%" }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="h-full bg-[#4fe3c3] transition-all duration-500 ease-out"
                                                        style={{ width: `${(step / 3) * 100}%` }}
                                                    />
                                                )}
                                            </div>
                                            <p className={`text-center text-sm font-medium animate-pulse text-[#4fe3c3]`}>
                                                {getStepLabel(step)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {error && (
                                        <div className="p-4 text-center rounded-xl bg-[#0a0a0a] border border-[#264c73] text-[#4fe3c3] text-sm">
                                            <p className="font-semibold text-center mb-1"> An error occurred while depositing </p>
                                            {error}
                                        </div>
                                    )}

                                    {/* Deposit Button */}
                                    {!loading && (
                                        <Button
                                            onClick={handleDeposit}
                                            disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isInsufficientBalance}
                                        >
                                            Deposit MXNe
                                        </Button>
                                    )}

                                    {/* Withdraw Button */}
                                    {hasLiquidity && !loading && (
                                        <Button
                                            isWithdraw
                                            onClick={handleWithdrawAll}
                                            className="mt-2"
                                        >
                                            Withdraw All
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}