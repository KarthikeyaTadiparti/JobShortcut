import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

export interface InlineEditProps {
    value: string;
    onSave: (newValue: string) => void | Promise<void>;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    showButtons?: boolean;
}

export function InlineEdit({
    value,
    onSave,
    placeholder = '',
    className = '',
    inputClassName = '',
    showButtons = true
}: InlineEditProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    useEffect(() => {
        setEditValue(value);
    }, [value]);

    const handleConfirm = () => {
        onSave(editValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(value);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.stopPropagation();
            handleConfirm();
        } else if (e.key === 'Escape') {
            e.stopPropagation();
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1.5 w-full my-0.5" onClick={(e) => e.stopPropagation()}>
                <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    placeholder={placeholder}
                    className={`flex-1 bg-background border border-indigo-500 rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs ${inputClassName}`}
                />
                {showButtons && (
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleConfirm();
                            }}
                            className="p-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer"
                            title="Confirm"
                        >
                            <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCancel();
                            }}
                            className="p-1 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 transition-colors cursor-pointer"
                            title="Cancel"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <span
            onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }}
            className={`cursor-pointer hover:bg-indigo-500/10 rounded px-1 -mx-1 transition-colors duration-150 select-none ${className}`}
            title="Double click to edit"
        >
            {value || <span className="text-muted-foreground/50 italic">{placeholder || 'Empty'}</span>}
        </span>
    );
}

export default InlineEdit;
