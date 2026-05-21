import * as React from "react"
import { Command, CommandGroup, CommandItem, CommandList } from "../ui/command"
import { Input } from "../ui/input"
import { Buyer } from "../../types/invoice"

interface BuyerAutocompleteProps {
    value: string
    suggestions: Buyer[]
    onChange: (value: string) => void
    onSelect: (buyer: Buyer) => void
    placeholder?: string
}

export function BuyerAutocomplete({ value, suggestions, onChange, onSelect, placeholder }: BuyerAutocompleteProps) {
    const [open, setOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    const filteredSuggestions = React.useMemo(() => {
        if (!value) return []
        return suggestions.filter(s =>
            s.name.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 5)
    }, [suggestions, value])

    // Close when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <div className="relative w-full" ref={containerRef}>
            <Input
                value={value}
                onChange={(e) => {
                    onChange(e.target.value)
                    setOpen(true)
                }}
                onFocus={() => {
                    if (filteredSuggestions.length > 0) setOpen(true)
                }}
                placeholder={placeholder}
                className="mt-1"
            />
            {open && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg outline-none animate-in fade-in-0 zoom-in-95">
                    <Command>
                        <CommandList className="max-h-[200px]">
                            <CommandGroup>
                                {filteredSuggestions.map((buyer) => (
                                    <CommandItem
                                        key={buyer.id}
                                        onSelect={() => {
                                            onSelect(buyer)
                                            setOpen(false)
                                        }}
                                        className="cursor-pointer hover:bg-accent hover:text-accent-foreground p-2"
                                    >
                                        <div className="flex flex-col w-full">
                                            <span className="font-medium">{buyer.name}</span>
                                            <div className="flex justify-between text-micro text-muted-foreground">
                                                <span>{buyer.vatId || 'No VAT ID'}</span>
                                                <span>{buyer.address?.city}, {buyer.address?.country}</span>
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </div>
            )}
        </div>
    )
}
