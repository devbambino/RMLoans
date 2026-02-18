//components/BorrowForm.tsx

import { useMorphoBorrow } from "@/lib/hooks/useMorphoBorrow";
import { useAccount } from 'wagmi';
import { useState, useMemo , useEffect} from "react";
import { formatUnits } from "viem";

interface BorrowFormProps {
    market: any;
}

export function BorrowForm({ market }: BorrowFormProps) {
    const { address } = useAccount();
    const {
        supplyAmount,
        setSupplyAmount,
        setBorrowAmount,
        apr,
        collateralPrice,
        totalBorrowed,
        totalSupplied,
        needsCollateralApproval,
        needsLoanTokenApproval,
        processing,
        isApproving,
        isOperationPending,
        collateralBalance,
        loanTokenBalance,
        approveCollateral,
        approveLoanToken,
        supply,
        borrow,
        error,
        txStatus,
        setTxStatus,
        startBorrowFlow
    } = useMorphoBorrow(market, address);

    const [borrowPct, setBorrowPct] = useState<number>(0);
    const collateralUsd = useMemo(() => {
        if (!collateralBalance || !collateralPrice) return 0;
        const collateralAmount = Number(formatUnits(collateralBalance, market.collateralToken.decimals));
        return collateralAmount * Number(collateralPrice);
    }, [collateralBalance, collateralPrice]);

    const maxBorrowableUsd = useMemo(() => {
        if (!collateralUsd) return 0;
        //const collateralAmount = Number(formatUnits(collateralBalance, market.collateralToken.decimals));
        //const collateralUsd = collateralAmount * Number(collateralPrice);
        const vaultLimit = 0.5; // 50% of collateral value
        return collateralUsd * vaultLimit;
    }, [collateralUsd]);

    const borrowAmountUsd = useMemo(() =>
        (maxBorrowableUsd * (borrowPct / 100)).toFixed(0),
        [maxBorrowableUsd, borrowPct]);

    const maxCollateral = useMemo(() => {
        if (!collateralBalance) return 0;
        return Number(formatUnits(collateralBalance, market.collateralToken.decimals));
    }, [collateralBalance]);

    const supplyCollateral = useMemo(() =>
        (maxCollateral * (borrowPct / 100)),
        [maxCollateral, borrowPct]);

    const borrowApy = useMemo(() => {
        return (apr * 100).toFixed(2);
    }, [apr]);
    const totalAvailable = useMemo(() => {
        return (totalSupplied - totalBorrowed).toFixed(2);
    }, [totalSupplied, totalBorrowed]);
    const utilization = useMemo(() => {
        if (totalSupplied === 0) return "0.00";
        return (totalBorrowed / totalSupplied * 100).toFixed(2);
    }, [totalSupplied, totalBorrowed]);

    const handleBorrow = async () => {
        if (!market || borrowPct <= 0) return;

        // Set borrow amount in the hook
        console.log("borrowForm borrowAmountUsd:", borrowAmountUsd);
        setBorrowAmount(borrowAmountUsd);

        console.log("borrowForm supplyCollateral:", supplyCollateral);
        setSupplyAmount("" + supplyCollateral);

        // First supply collateral if needed
        console.log("borrowForm needsCollateralApproval:", needsCollateralApproval);
        const supplyAmountStr = "" + supplyCollateral;
        const borrowAmountStr = borrowAmountUsd;

        // Kick off the full flow: approve collateral -> supply -> (approve loan token) -> borrow
        try {
            await startBorrowFlow(supplyAmountStr, borrowAmountStr);
        } catch (e) {
            console.error("borrow flow failed:", e);
        }
    };

    // Auto-hide txStatus after 3 seconds when it appears
    useEffect(() => {
        if (txStatus && txStatus.length > 0) {
            const timer = setTimeout(() => {
                setTxStatus("");
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [txStatus]);

    return (
        <div className="space-y-3 pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loan Info</h3>
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <p className="text-sm text-gray-600">APR</p>
                    <p className="text-xl font-bold text-orange-600">{borrowApy}%</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Total Available</p>
                    <p className="text-xl font-bold">${totalAvailable}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Utilization</p>
                    <p className="text-xl font-bold">{utilization}%</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>Your Collateral Value</div>
                <div>${collateralUsd.toFixed(2)}</div>
                <div>Max borrowable</div>
                <div>${maxBorrowableUsd.toFixed(2)}</div>
            </div>

            {txStatus && (
                <div className={`p-3 rounded-lg ${txStatus.includes("success") || txStatus.includes("ing")
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                    }`}>
                    {txStatus}
                </div>
            )}

            {collateralUsd > 0 && (
                <>
                    <div className="pt-4">
                        <div className="text-sm text-gray-700 mb-2">
                            Borrow amount (% of your limit)
                        </div>
                        <div className="flex gap-2">
                            {[10, 20, 30, 40, 50, 100].map((pct) => (
                                <button
                                    key={pct}
                                    onClick={() => setBorrowPct(pct)}
                                    className={`px-3 py-1 rounded ${borrowPct === pct
                                        ? "bg-brand-green text-white"
                                        : "bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {borrowPct > 0 && (
                        <div className="pt-4 border-t space-y-2">
                            <div className="text-gray-700 text-sm">
                                You'll borrow: <strong>${borrowAmountUsd}</strong> USDC using <strong>{supplyCollateral.toFixed(4)}</strong> {market.collateralToken.symbol}
                            </div>
                            <div className="text-xs text-gray-500">
                                This locks collateral and incurs the APR shown above.
                            </div>
                            <button
                                onClick={handleBorrow}
                                disabled={isApproving || isOperationPending || processing}
                                className={`w-full bg-brand-green text-white p-3 rounded-lg ${(isApproving || isOperationPending || processing) ? 'opacity-50' : ''
                                    }`}
                            >
                                {processing ? (
                                    <span className="flex items-center justify-center">
                                        <div className="animate-spin h-4 w-4 border-b-2 border-white mr-2"></div>
                                        {isApproving ? "Approving..." : "Depositing & Borrowing..."}
                                    </span>
                                ) : (
                                    'Borrow Now'
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}


        </div>
    );
}
