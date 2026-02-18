//lib/hooks/useMorphoBorrow.ts

import { useState, useEffect } from "react";
import { parseUnits, formatUnits } from "viem";
import { useReadContract, useWriteContract, useChainId } from "wagmi";
import { ERC20_ABI, MORPHO_ABI, IRM_ABI, MORPHO_ABI_B, ORACLE_ABI_V2 } from "@/lib/ABIs";
import { createTxStatusMessage, formatErrorMessage } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { getContractsForChain } from "@/lib/constants";

interface Market {
    id: string;
    oracleAddress: string;
    irmAddress: string;
    lltv: string;
    loanToken: {
        address: string;
        symbol: string;
        decimals: number;
    };
    collateralToken: {
        address: string;
        symbol: string;
        decimals: number;
    };
}

export function useMorphoBorrow(market?: Market | null, userAddress?: string) {
    const chainId = useChainId();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    //const [amount, setAmount] = useState("");
    const [supplyAmount, setSupplyAmount] = useState("");//Always 100% of collateral available to avoid liquidations
    const [borrowAmount, setBorrowAmount] = useState("");
    const [apr, setApr] = useState(0);
    const [totalSupplied, setTotalSupplied] = useState(0);
    const [totalBorrowed, setTotalBorrowed] = useState(0);
    const [collateralSupplied, setCollateralSupplied] = useState(0);
    const [assetsBorrowed, setAssetsBorrowed] = useState(0);
    const [collateralPrice, setCollateralPrice] = useState("");
    const [txStatus, setTxStatus] = useState("");
    const queryClient = useQueryClient();

    // orchestration flags for chaining approval -> supply -> approval -> borrow
    const [pendingSupply, setPendingSupply] = useState(false);
    const [pendingBorrow, setPendingBorrow] = useState(false);
    const [pendingBorrowAfterSupply, setPendingBorrowAfterSupply] = useState(false);

    const contracts = getContractsForChain(chainId);

    const marketData = process.env.NEXT_PUBLIC_NETWORK === "testnet" ? {
        id: process.env.NEXT_PUBLIC_MARKET_ID_TEST!,
        collateralToken: process.env.NEXT_PUBLIC_CBBTC_FRT!,// 8 decimals
        collateralDecimals: 8,
        loanToken: process.env.NEXT_PUBLIC_USDC_FRT!,// 18 decimals
        loanDecimals: 18,// real one is 6 decimals
        oracleAddress: process.env.NEXT_PUBLIC_ORACLE_CBBTC_TEST!,
        //irmAddress: "0x46415998764C29aB2a25CbeA6254146D50D22687",
    } : {
        id: market?.id,
        collateralToken: market?.collateralToken.address,
        collateralDecimals: market?.collateralToken.decimals,
        loanToken: market?.loanToken.address,
        loanDecimals: market?.loanToken.decimals,
        oracleAddress: market?.oracleAddress,
        //irmAddress:  market?.irmAddress,
    };

    const marketParams = process.env.NEXT_PUBLIC_NETWORK === "testnet" ? {
        loanToken: process.env.NEXT_PUBLIC_USDC_FRT!,// 18 decimals
        collateralToken: process.env.NEXT_PUBLIC_CBBTC_FRT!,// 8 decimals
        oracle: process.env.NEXT_PUBLIC_ORACLE_CBBTC_TEST!,
        irm: process.env.NEXT_PUBLIC_MARKET_IRM_TEST!,
        lltv: BigInt(860000000000000000), // 86% LLTV
    } : {
        loanToken: market?.loanToken.address,
        collateralToken: market?.collateralToken.address,
        oracle: market?.oracleAddress,
        irm: market?.irmAddress,
        lltv: BigInt(market?.lltv!), // LLTV
    };

    // Read token balances and allowances


    const { data: loanTokenAllowance } = useReadContract({
        address: marketData.loanToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: userAddress && marketData.loanToken ?
            [userAddress as `0x${string}`, contracts.morphoMarkets as `0x${string}`] : undefined,
        query: { enabled: !!userAddress && !!marketData.loanToken },
    });
    //console.log("borrowHook loanTokenAllowance:", loanTokenAllowance);

    const { data: collateralAllowance } = useReadContract({
        address: marketData.collateralToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: userAddress && marketData.collateralToken ?
            [userAddress as `0x${string}`, contracts.morphoMarkets as `0x${string}`] : undefined,
        query: { enabled: !!userAddress && !!marketData.collateralToken },
    });
    //console.log("borrowHook collateralAllowance:", collateralAllowance);



    // Market Details reading
    const { data: marketDetailsData, refetch: fetchMarketDetails } = useReadContract({
        address: contracts.morphoMarkets as `0x${string}`,
        abi: MORPHO_ABI,
        functionName: "market",
        args: marketData ? [marketData.id] : undefined,
        query: { enabled: !!marketData && !!userAddress },
    });
    const marketDetails = marketDetailsData as any | undefined;
    //console.log("borrowHook marketDetails:", marketDetails);

    // borrowRateView  reading
    const { data: borrowRateViewData, refetch: fetchBorrowRate } = useReadContract({
        address: marketParams.irm as `0x${string}`,
        abi: IRM_ABI,
        functionName: "borrowRateView",
        args: marketDetails ? [marketParams, marketDetails] : undefined,
        query: { enabled: !!marketDetails },
    });
    const borrowRateView = borrowRateViewData as bigint | undefined;
    //console.log("borrowHook borrowRateView:", borrowRateView);

    // Position reading
    const { data: positionData, refetch: fetchPosition } = useReadContract({
        address: contracts.morphoMarkets as `0x${string}`,
        abi: MORPHO_ABI,
        functionName: "position",
        args: marketData && userAddress ? [marketData.id, userAddress as `0x${string}`] : undefined,
        query: { enabled: !!marketData && !!userAddress },
    });
    const position = positionData as any | undefined;
    console.log("borrowHook position:", position);

    const { data: loanTokenBalance, refetch: fetchLoanBalance } = useReadContract({
        address: marketData.loanToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: userAddress ? [userAddress] : undefined,
        query: { enabled: !!userAddress && !!marketData.loanToken },
    });
    const { data: collateralBalanceData, refetch: fetchCollateralBalance } = useReadContract({
        address: marketData.collateralToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: userAddress ? [userAddress] : undefined,
        query: { enabled: !!userAddress && !!marketData.collateralToken },
    });
    const collateralBalance = collateralBalanceData as bigint | undefined;
    //console.log("borrowHook collateralBalance:", collateralBalance);
    //console.log("borrowHook loanTokenBalance:", loanTokenBalance);

    // Add oracle price reading
    const { data: oraclePriceData } = useReadContract({
        address: marketData.oracleAddress as `0x${string}`,
        abi: ORACLE_ABI_V2,
        functionName: "price",
        query: { enabled: !!marketData?.oracleAddress },
    });
    const oraclePrice = oraclePriceData as bigint | undefined;// decimals= 36 + loan token decimals - collateral token decimals
    //console.log("borrowHook oraclePrice:", oraclePrice, " oracle: ", market?.oracleAddress);

    useEffect(() => {
        if (marketDetails) {
            setTotalSupplied(Number(formatUnits(marketDetails[0], marketData.loanDecimals!)));
            setTotalBorrowed(Number(formatUnits(marketDetails[2], marketData.loanDecimals!)));
            // When marketDetails updates, trigger a refetch for the dependent borrow rate.
            fetchBorrowRate();
        }
    }, [marketDetails]);

    useEffect(() => {
        if (position) {
            setCollateralSupplied(position[2]);
            setAssetsBorrowed(Number(position[1]) / 1000000);//converting from borrowShares to assets
            console.log("borrowHook CollateralSupplied:", position[2], " AssetsBorrowed:", position[1]);
        }
    }, [position]);

    useEffect(() => {
        if (borrowRateView) {
            const borrowRate = Number(borrowRateView) / 1e18;
            const secondsPerYear = 60 * 60 * 24 * 365;
            const borrowApy = Math.exp(borrowRate * secondsPerYear) - 1;
            setApr(borrowApy);
            console.log("borrowHook apr:", borrowApy * 100);
        }
    }, [borrowRateView]);

    // Update supply amount when borrow amount or price changes
    useEffect(() => {
        if (oraclePrice && marketData) {
            //const formattedPrice = Number(oraclePrice / BigInt(10 ** (36 + (process.env.NEXT_PUBLIC_NETWORK === "testnet" ? marketParamsDev.loanDecimals - marketParamsDev.collateralDecimals : market.loanToken.decimals - market.collateralToken.decimals)))).toFixed(2);
            const formattedPrice = Number(oraclePrice / BigInt(10 ** (36 + (Number(marketData.loanDecimals) - Number(marketData.collateralDecimals))))).toFixed(2);
            setCollateralPrice(formattedPrice);
            //console.log("borrowHook CollateralPrice:", formattedPrice);
        }
    }, [oraclePrice]);

    // Write contract hooks
    const { writeContract: writeApprove, isPending: isApproving } = useWriteContract({
        mutation: {
            onSuccess: () => {
                setTxStatus(createTxStatusMessage("Approval", true));
                queryClient.invalidateQueries();
                // If this approval was requested to allow a supply, trigger supply after 1s
                if (pendingSupply) {
                    setPendingSupply(false);
                    setTxStatus("Depositing collateral...");
                    setTimeout(() => {
                        executeMarketOperation('supplyCollateral', supplyAmount);
                    }, 2000);
                }
            },
            onError: (error) => {
                setTxStatus(createTxStatusMessage("Approval", false, formatErrorMessage(error)));
                setPendingSupply(false);
                setPendingBorrow(false);
                setProcessing(false);
            },
        },
    });

    const { writeContract: writeMarketOp, isPending: isOperationPending } = useWriteContract({
        mutation: {
            onSuccess: async () => {
                //setTxStatus(createTxStatusMessage("Success", true));
                queryClient.invalidateQueries();

                // If we supplied collateral and need to continue with borrow flow, do it here.
                if (pendingBorrowAfterSupply) {

                    setTxStatus("Collateral deposited! Withdrawing the loan...");

                    try {
                        if (fetchMarketDetails) await fetchMarketDetails();
                        //if (fetchBorrowRate) await fetchBorrowRate();
                        // if you have refetch for position / allowances, call those too
                    } catch (err) {
                        console.warn("refetch after write failed", err);
                    } finally {
                        setPendingBorrowAfterSupply(false);
                        setTimeout(() => {
                            executeMarketOperation('borrow', borrowAmount);
                        }, 4000);
                    }
                } else {
                    /*try {
                        if (fetchMarketDetails) await fetchMarketDetails();
                        //if (fetchBorrowRate) await fetchBorrowRate();
                        // if you have refetch for position / allowances, call those too
                    } catch (err) {
                        console.warn("refetch after write failed", err);
                    } finally {
                        setProcessing(false);
                    }*/

                    // 2. DELAYED Robust Refetch
                    // Wait 3 seconds for RPC nodes to catch up with the new block
                    setTxStatus("Withdrawal completed! Syncing with network...");
                    setTimeout(async () => {
                        //console.log("Executing delayed data refresh...");

                        // Refetch in parallel for speed, or sequence if dependencies strongly required
                        await Promise.all([
                            fetchMarketDetails(),
                            fetchPosition(),
                            fetchLoanBalance(),
                            fetchCollateralBalance()
                        ]);

                        // Fetch this last as it might depend on updated marketDetails (handled by useEffect, but double-tap doesn't hurt)
                        await fetchBorrowRate();

                        setTxStatus(createTxStatusMessage("Borrow", true));
                        setProcessing(false);
                    }, 3000);
                }
            },
            onError: (error) => {
                console.error("borrowHook writeMarketOp error:", error);
                setTxStatus(createTxStatusMessage("Error", false, formatErrorMessage(error)));
                setProcessing(false);
            },
        },
    });

    const handleApprove = async (isCollateral: boolean, amount?: string) => {
        const token = isCollateral ? marketData.collateralToken : marketData.loanToken;
        if (!token || !userAddress) return;

        setError(null);
        try {
            const amountToApprove = amount ?? (isCollateral ? supplyAmount : borrowAmount) ?? "0";
            // set pending flags so writeApprove.onSuccess can chain the next operation
            if (isCollateral) {
                setPendingSupply(true);
            } else {
                setPendingBorrow(true);
            }
            setTxStatus(`Approving ${isCollateral ? 'collateral' : 'loan token'}...`);
            await writeApprove({
                address: token as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [
                    contracts.morphoMarkets as `0x${string}`,
                    parseUnits(amountToApprove, isCollateral ? marketData.collateralDecimals! : marketData.loanDecimals!),
                ],
            });
        } catch (e) {
            // reset pending flags in case of immediate error
            setPendingSupply(false);
            setPendingBorrow(false);
            console.error("borrowHook Approving error:", e);
            setError(formatErrorMessage(e));
        }
    };

    // orchestrator to start the full borrow flow: approve collateral -> supply -> (approve loan token) -> borrow
    const startBorrowFlow = async (supplyAmt?: string, borrowAmt?: string) => {
        if (!marketParams || !userAddress) return;
        // set amounts in hook state so callbacks can read them
        if (supplyAmt) setSupplyAmount(supplyAmt);
        if (borrowAmt) setBorrowAmount(borrowAmt);

        setProcessing(true);
        setTxStatus("Approving the collateral...");

        // indicate that after supply we want to proceed to borrow
        setPendingBorrowAfterSupply(true);
        setPendingSupply(true);
        try {
            await writeApprove({
                address: marketData.collateralToken as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [contracts.morphoMarkets as `0x${string}`, parseUnits(supplyAmt ?? supplyAmount, marketData.collateralDecimals!)],
            });
        } catch (e) {
            setPendingSupply(false);
            setPendingBorrowAfterSupply(false);
            setProcessing(false);
            setTxStatus(createTxStatusMessage("Approval", false, formatErrorMessage(error)));
            throw e;
        }
    };

    const executeMarketOperation = async (
        operation: 'supplyCollateral' | 'withdrawCollateral' | 'borrow' | 'repay',
        amount?: string,
        e?: React.FormEvent
    ) => {
        e?.preventDefault();
        if (!marketParams || !userAddress) return;

        setError(null);
        try {
            let args;
            switch (operation) {
                case 'supplyCollateral':
                    args = [
                        marketParams,
                        parseUnits(amount ?? supplyAmount, marketData.collateralDecimals!), // collateral decimals
                        userAddress,
                        "0x" // metadata
                    ];
                    break;
                case 'withdrawCollateral':
                    args = [
                        marketParams,
                        parseUnits(amount ?? supplyAmount, marketData.collateralDecimals!), // collateral decimals
                        userAddress,
                        userAddress
                    ];
                    break;
                case 'borrow':
                    args = [
                        marketParams,
                        parseUnits(amount ?? borrowAmount, marketData.loanDecimals!), // loan token decimals
                        0, // maxIterations
                        userAddress,
                        userAddress
                    ];
                    break;
                case 'repay':
                    args = [
                        marketParams,
                        0, // assets (0 when repaying with shares)
                        position ? position[1] : 0, // borrowShares for full repayment, with 24 decimals
                        userAddress,
                        "0x" // metadata
                    ];
                    break;
            }
            //console.log("borrowHook operation args:", args);

            // Call the appropriate market function based on operation
            const fnName = operation;
            await writeMarketOp({
                address: contracts.morphoMarkets as `0x${string}`,
                abi: MORPHO_ABI_B,
                functionName: fnName,
                args: args,
            });
            //setTxStatus(createTxStatusMessage(operation, true));
        } catch (e) {
            console.error("borrowHook  marketOp error:", e);
            setTxStatus(createTxStatusMessage(operation, false, formatErrorMessage(error)));
            setError(formatErrorMessage(e));
            setProcessing(false);
        }
    };

    // Check if approvals are needed
    const needsLoanTokenApproval = loanTokenAllowance !== undefined &&
        parseUnits(borrowAmount || "0", marketData.loanDecimals! || 18) > (loanTokenAllowance as bigint);
    const needsCollateralApproval = collateralAllowance !== undefined &&
        parseUnits(supplyAmount || "0", marketData.collateralDecimals! || 8) > (collateralAllowance as bigint);

    useEffect(() => {
        setLoading(false);
    }, [marketParams, userAddress]);

    return {
        loading,
        processing,
        error,
        apr,
        borrowAmount,
        setBorrowAmount,
        supplyAmount,
        setSupplyAmount,
        collateralPrice,
        totalBorrowed,
        totalSupplied,
        txStatus,
        setTxStatus,
        isApproving,
        isOperationPending,
        needsLoanTokenApproval,
        needsCollateralApproval,
        position,
        collateralBalance,
        loanTokenBalance,
        pendingSupply,
        pendingBorrow,
        pendingBorrowAfterSupply,
        approveLoanToken: (amount?: string) => handleApprove(false, amount),
        approveCollateral: (amount?: string) => handleApprove(true, amount),
        supply: (amount?: string, e?: React.FormEvent) => executeMarketOperation('supplyCollateral', amount, e),
        withdraw: (amount?: string, e?: React.FormEvent) => executeMarketOperation('withdrawCollateral', amount, e),
        borrow: (amount?: string, e?: React.FormEvent) => executeMarketOperation('borrow', amount, e),
        repay: (amount?: string, e?: React.FormEvent) => executeMarketOperation('repay', amount, e),
        startBorrowFlow,
    };
}
