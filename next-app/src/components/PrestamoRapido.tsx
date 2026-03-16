"use client";

import { useState, useEffect, useMemo } from "react";
import { useMorphoLoan } from "../hooks/useMorphoLoan";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowPathIcon, BanknotesIcon, CircleStackIcon, LockClosedIcon, CreditCardIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import BalancesGrid, { BalanceItem } from "./BalancesGrid";
import Input from "./Input";
import Button from "./Button";
import AppCard from "./AppCard";
import ErrorDisplay from "./ErrorDisplay";
import ProgressStepper from "./ProgressStepper";
import SuccessScreen from "./SuccessScreen";

export default function PrestamoRapido() {
    const { authenticated, login } = usePrivy();
    const { loading, step, error, txHash, usdcBalance, mxneBalance, collateralBalance, borrowBalance, marketLiquidity, marketAPR, totalRepaidAmount, userPaidSubsidyInUSDC, userInterestInMxne, userInterestInUSDC, executeZale, executeRepayAndWithdraw, getSimulatedDeposit, resetState } = useMorphoLoan();

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
    // Steps for the stepper
    const steps = [
        "Approving USDC",
        "Depositing in Vault",
        "Approving mUSDC",
        "Wrapping to WmUSDC",
        "Approving Collateral",
        "Depositing Collateral",
        "Requesting MXNe"
    ];

    const getRepayStepLabel = (s: number) => {
        switch (s) {
            case 11: return "Verifying MXNe...";
            case 12: return "Paying Debt...";
            case 13: return "Withdrawing Collateral...";
            case 14: return "Unwrapping WmUSDC...";
            case 15: return "Recovering USDC...";
            case 16: return "Completed!";
            default: return "Processing...";
        }
    };

    // Derived state for validation
    const isExceedingLiquidity = Boolean(borrowAmount && parseFloat(borrowAmount) > parseFloat(marketLiquidity));
    const isInsufficientBalance = parseFloat(usdcBalance) < parseFloat(requiredDeposit || "0");
    const isInsufficientBalanceWithdraw = useMemo(() => {
        return mxneBalance <= borrowBalance;
    }, [mxneBalance, borrowBalance]);
    const balanceRows: BalanceItem[][] = [
        [
            { label: "USDC", value: `${usdcBalance} USDC`, icon: CircleStackIcon, highlightValue: true },
            { label: "MXNE", value: `${mxneBalance} MXNe`, icon: BanknotesIcon, highlightValue: true },
            { label: "Collateral", value: `${collateralBalance} WmUSDC`, icon: LockClosedIcon }
        ],
        [
            { label: "Current Debt", value: `${borrowBalance} MXNe`, icon: CreditCardIcon },
            { label: "Rate (APR)", value: `${marketAPR}%`, icon: ChartBarIcon },
            { label: "Liquidity", value: `${marketLiquidity} MXNe`, icon: CircleStackIcon }
        ]
    ];

    return (
        <AppCard>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl mb-2 border-b-4 border-[#264c73] font-bold text-white">
                        Quick Loan
                    </h2>
                    <p className="text-sm font-bold text-[#4fe3c3] mt-1">Get MXNe instantly</p>
                </div>
                <div className="p-3 rounded-full bg-[#0a0a0a] border border-[#264c73]">
                    <BanknotesIcon className="w-6 h-6 text-[#4fe3c3]" />
                </div>
            </div>

            {!authenticated ? (
                <div className="text-center py-12">
                    <p className="text-gray-200 mb-6">Sign In/Up to get started</p>
                    <Button onClick={login}>
                        Sign In/Up
                    </Button>
                </div>
            ) : (
                <>
                    {/* Balances Grid */}
                    <BalancesGrid
                        columns={2}
                        className="mb-2 mt-2"
                        rows={[
                            [
                                { label: "Your Dollars", value: `${usdcBalance} USDC`, icon: CircleStackIcon, highlightValue: true },
                                { label: "Your Pesos", value: `${mxneBalance} MXNe`, icon: BanknotesIcon, highlightValue: true }
                            ]
                        ]}
                    />
                    <BalancesGrid
                        columns={2}
                        className="mb-2 mt-2"
                        rows={[
                            [
                                { label: "Current Debt", value: `${borrowBalance} MXNe`, icon: CreditCardIcon },
                                { label: "Collateral Used", value: `${collateralBalance} USDC`, icon: LockClosedIcon }
                            ]
                        ]}
                    />
                    <BalancesGrid
                        columns={2}
                        className="mb-2 mt-2"
                        rows={[
                            [
                                { label: "Rate (APR)", value: `${marketAPR}%`, icon: ChartBarIcon },
                                { label: "Available", value: `${marketLiquidity} MXNe`, icon: CircleStackIcon }
                            ]
                        ]}
                    />

                    {step === 8 ? (
                        <SuccessScreen
                            title="Operation Successful!"
                            buttonText="Perform Another Operation"
                            onButtonClick={() => { setBorrowAmount(""); resetState(); }}
                        >
                            <p className="text-gray-200">
                                You received <span className="text-[#4fe3c3] font-bold text-lg">{borrowAmount} MXNe</span>
                            </p>
                        </SuccessScreen>
                    ) : step === 16 ? (
                        <SuccessScreen
                            title="Payment Successful!"
                            buttonText="Back to Home"
                            onButtonClick={() => { setBorrowAmount(""); resetState(); }}
                        >
                            <div className="text-sm bg-[#0a0a0a] border border-[#264c73] p-4 rounded-lg space-y-2 text-left">
                                <div className="flex justify-between">
                                    <span className="text-gray-200">Status:</span>
                                    <span className="text-[#4fe3c3]">Debt Repaid</span>
                                </div>
                                {parseFloat(userPaidSubsidyInUSDC || "0") > 0 ? (
                                    <>
                                        <div className="h-px bg-[#264c73] my-6" />
                                        <div className="text-center">
                                            <div className="text-xs text-[#4fe3c3] font-semibold mb-2 flex items-center justify-center gap-1">
                                                💰 We've subsidized your loan interest!!!
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <span className="text-gray-200">We gave you (approx.):</span>
                                            <span className="text-xl text-[#4fe3c3] font-bold font-mono">$USD {userPaidSubsidyInUSDC}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-px bg-[#264c73] my-6" />
                                        <div className="text-center">
                                            <div className="text-xs text-[#4fe3c3] font-semibold mb-2 flex items-center justify-center gap-1">
                                                💰 Not enough USDC yield was generated so we couldn't subsidized your loan interest!!!
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <span className="text-gray-200">We would have gave you (approx.):</span>
                                            <span className="text-xl text-[#4fe3c3] font-bold font-mono">$USD {userInterestInUSDC}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </SuccessScreen>
                    ) : (
                        /* Input Section */
                        <div className="space-y-6 py-6">
                            <Input
                                label="How much MXNe do you want to receive?"
                                symbol="MXNE"
                                value={borrowAmount}
                                onChange={(e) => setBorrowAmount(e.target.value)}
                                disabled={loading}
                                errorMessage={isExceedingLiquidity ? "Insufficient liquidity in market" : null}
                            />

                            {/* Simulation Output */}
                            <div className="p-4 rounded-xl bg-[#0a0a0a] border border-[#264c73] space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white">Required Deposit (Est.)</span>
                                    <span className="text-white font-mono font-medium">{requiredDeposit} USDC</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-200">Available Balance</span>
                                    <span className="text-gray-200 font-mono">{usdcBalance} USDC</span>
                                </div>
                                {/* Validation Errors */}
                                {isInsufficientBalance && (
                                    <div className="text-xs text-[#4fe3c3] mt-2 flex items-center gap-1">
                                        ⚠️ Insufficient balance
                                    </div>
                                )}
                            </div>

                            {/* Progress Stepper (Visible when loading) */}
                            {loading && (
                                step < 10 ? (
                                    <ProgressStepper
                                        title="Processing Loan..."
                                        currentStep={Math.min(step, 7)}
                                        totalSteps={7}
                                        stepLabel={step === 0 ? "Starting..." : step > 7 ? "Ready!" : steps[step - 1]}
                                    />
                                ) : (
                                    <ProgressStepper
                                        title="Processing Payment..."
                                        currentStep={Math.min(step - 10, 5)}
                                        totalSteps={5}
                                        stepLabel={getRepayStepLabel(step)}
                                    />
                                )
                            )}

                            {/* Error Message */}
                            {error && <ErrorDisplay error={error} />}

                            {/* Action Button */}
                            <Button
                                onClick={handleBorrow}
                                disabled={loading || !borrowAmount || parseFloat(borrowAmount) <= 0 || isInsufficientBalance || isExceedingLiquidity}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2 text-[#4fe3c3]">
                                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </span>
                                ) : step === 8 ? (
                                    "Request Another Loan"
                                ) : (
                                    "Deposit and Borrow"
                                )}
                            </Button>

                            {/* Repay Button - Only show if user has debt or collateral */}
                            {(!loading && (parseFloat(borrowBalance) > 0 || parseFloat(collateralBalance) > 0)) && (
                                <Button
                                    isWithdraw
                                    onClick={executeRepayAndWithdraw}
                                    className="mt-4"
                                    disabled={isInsufficientBalanceWithdraw}
                                >
                                    {isInsufficientBalanceWithdraw ? "Insufficient Balance" : "Pay All and Withdraw"}
                                </Button>
                            )}
                        </div>
                    )}
                </>
            )}
        </AppCard>
    );
}