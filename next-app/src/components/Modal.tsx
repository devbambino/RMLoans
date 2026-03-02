"use client";

import React, { useEffect, useState } from "react";
import { XMarkIcon, DocumentDuplicateIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import Button from "./Button";
import Input from "./Input";
import { usePrivy } from "@privy-io/react-auth";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, subtitle, children }: ModalProps) {
    // Escape key listener to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
        }
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {/* Background click listener */}
            <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

            <div className="relative w-full max-w-md bg-[#0a0a0a] border border-[#264c73] rounded-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-6 right-6 z-10 text-gray-400 cursor-pointer hover:text-white transition-colors">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="mb-6 mt-3">
                    <h3 className="text-xl w-fit mb-2 border-b-4 border-[#264c73] font-bold text-white uppercase">{title}</h3>
                    {subtitle && <p className="text-sm font-bold text-[#4fe3c3] mt-1">{subtitle}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}

interface SendModalProps {
    isOpen: boolean;
    onClose: () => void;
    currency: "USDC" | "MXNB";
    balance: string;
}

export function SendModal({ isOpen, onClose, currency, balance }: SendModalProps) {
    const [amount, setAmount] = useState("");
    const [address, setAddress] = useState("");

    const isExceedingBalance = amount ? parseFloat(amount) > parseFloat(balance || "0") : false;
    const isValid = amount && parseFloat(amount) > 0 && !isExceedingBalance && address.trim().length > 0;

    // Reset fields when closing the modal
    useEffect(() => {
        if (!isOpen) {
            setAmount("");
            setAddress("");
        }
    }, [isOpen]);

    const handleSend = () => {
        if (!isValid) return;
        // The actual sending transaction logic would go here
        alert(`Sending ${amount} ${currency} to ${address}`);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Send ${currency}`} subtitle="Transfer funds securely">
            <div className="space-y-6">
                <div className="text-sm">
                    <Input
                        label="Amount to send"
                        symbol={currency}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onMaxClick={() => setAmount(balance)}
                        placeholder="0.00"
                        errorMessage={isExceedingBalance ? "Amount exceeds available balance" : null}
                    />
                    <div className="text-right text-xs text-gray-400 mt-2">
                        Available Balance: <span className="text-white font-mono">{balance} {currency}</span>
                    </div>
                </div>
                <div>
                    <Input
                        type="text"
                        label="Recipient wallet address"
                        symbol=""
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="0x..."
                    />
                </div>
                <Button disabled={!isValid} onClick={handleSend} className="w-full">
                    Confirm Send
                </Button>
            </div>
        </Modal>
    );
}

interface ReceiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    currency: "USDC" | "MXNB";
}

export function ReceiveModal({ isOpen, onClose, currency }: ReceiveModalProps) {
    const { user } = usePrivy();
    const [copied, setCopied] = useState(false);

    const walletAddress = user?.wallet?.address || "";

    const handleCopy = () => {
        if (!walletAddress) return;
        navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Receive ${currency}`} subtitle="Deposit funds to your wallet">
            <div className="space-y-6">
                <div className="text-sm text-gray-200 border border-[#264c73] p-5 rounded-xl bg-[#0a0a0a]/50">
                    <p className="font-semibold text-white mb-3 flex items-center gap-2">
                        <InformationCircleIcon className="w-5 h-5 text-[#4fe3c3]" />
                        How to receive {currency}
                    </p>
                    <ol className="list-decimal space-y-3 pl-5 text-gray-300">
                        <li>Copy your wallet address below.</li>
                        <li>Open your preferred exchange app (e.g., Binance).</li>
                        <li>Go to your assets, select <strong>{currency}</strong>, and tap <strong>Withdraw</strong>.</li>
                        <li>Paste your address and confirm the transfer on the correct network.</li>
                    </ol>
                </div>

                <div className="w-full">
                    <label className="block text-xs font-medium text-white mb-2 uppercase tracking-wide">
                        Your Wallet Address
                    </label>
                    <button
                        onClick={handleCopy}
                        className="w-full cursor-pointer flex items-center justify-between bg-[#111111] border border-[#264c73] rounded-xl px-4 py-4 text-white hover:border-[#4fe3c3] hover:bg-[#264c73]/20 transition-all group shadow-sm"
                        title="Copy Address"
                    >
                        <span className="font-mono text-sm truncate mr-4 opacity-90 group-hover:opacity-100 transition-opacity">
                            {walletAddress || "Address not found"}
                        </span>
                        {copied ? (
                            <div className="flex items-center gap-1 bg-[#4fe3c3]/10 text-[#4fe3c3] px-2 py-1 rounded">
                                <span className="text-xs font-bold whitespace-nowrap">Copied!</span>
                            </div>
                        ) : (
                            <div className="p-2 rounded bg-[#264c73]/30 group-hover:bg-[#4fe3c3]/20 transition-colors">
                                <DocumentDuplicateIcon className="w-5 h-5 text-gray-400 group-hover:text-[#4fe3c3] shrink-0" />
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
