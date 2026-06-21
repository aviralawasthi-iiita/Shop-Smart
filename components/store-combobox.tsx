"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface StoreInfo {
  storeId: number
  storeName: string
  storeLocation: string
}

interface StoreComboboxProps {
  selectedStoreId: number | null
  onSelectStore: (store: StoreInfo) => void
  placeholder?: string
  className?: string
  buttonClassName?: string
}

export function StoreCombobox({
  selectedStoreId,
  onSelectStore,
  placeholder = "Search for a store...",
  className,
  buttonClassName,
}: StoreComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [stores, setStores] = React.useState<StoreInfo[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch("/api/stores")
        if (res.ok) {
          const data = await res.json()
          setStores(data)
        }
      } catch (err) {
        console.error("Failed to fetch stores", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStores()
  }, [])

  const selectedStore = stores.find((store) => store.storeId === selectedStoreId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", buttonClassName)}
        >
          {selectedStore
            ? `${selectedStore.storeName} - ${selectedStore.storeLocation}`
            : isLoading
            ? "Loading stores..."
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", className)}>
        <Command>
          <CommandInput placeholder="Search by name or location..." />
          <CommandList>
            <CommandEmpty>No store found.</CommandEmpty>
            <CommandGroup>
              {stores.map((store) => (
                <CommandItem
                  key={store.storeId}
                  value={`${store.storeName} ${store.storeLocation}`}
                  onSelect={() => {
                    onSelectStore(store)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedStoreId === store.storeId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {store.storeName} - {store.storeLocation}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
