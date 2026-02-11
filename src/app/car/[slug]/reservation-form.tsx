"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, differenceInDays, format, isAfter } from "date-fns";
import { Check, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { Car, Location } from "@/lib/db/definitions";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createReservation } from "@/lib/actions/reservation";
import { SearchParams } from "@/lib/enums";
import { cn, formatCurrency } from "@/lib/utils";

const FormSchema = z
  .object({
    location: z.string({ required_error: "Location is required" }),
    checkin: z.date({ required_error: "Check in is required" }),
    checkout: z.date({ required_error: "Check out is required" }),
  })
  .refine((schema) => isAfter(schema.checkout, schema.checkin), {
    message: "Check out must be after check in",
    path: ["checkout"],
  })
  .refine(
    ({ checkin, checkout }) => differenceInDays(checkout, checkin) <= 30,
    {
      message: "Maximum 30 days allowed for booking",
      path: ["checkout"],
    }
  );

type FormData = z.infer<typeof FormSchema>;

type ReservationFormProps = {
  car: Car;
  locations: Location[];
  pricePerDay: number;
  currency: string;
};

export function ReservationForm(props: ReservationFormProps) {
  const { car, locations, pricePerDay, currency } = props;

  const searchParams = useSearchParams();

  const [days, setDays] = React.useState<number>();
  const [subtotal, setSubtotal] = React.useState<number>();
  const [taxesAndFees, setTaxesAndFees] = React.useState<number>();
  const [total, setTotal] = React.useState<number>();
  const [locationOpen, setLocationOpen] = React.useState(false);
  const [checkinOpen, setCheckinOpen] = React.useState(false);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
  });

  // Calculate totals whenever dates change
  const calculateTotal = React.useCallback(
    (checkin?: Date, checkout?: Date) => {
      if (checkin && checkout && isAfter(checkout, checkin)) {
        const calculatedDays = differenceInDays(checkout, checkin);
        const calculatedSubtotal = pricePerDay * calculatedDays;
        const calculatedTaxesAndFees = calculatedSubtotal * 0.16;
        const calculatedTotal = calculatedSubtotal + calculatedTaxesAndFees;

        setDays(calculatedDays);
        setSubtotal(calculatedSubtotal);
        setTaxesAndFees(calculatedTaxesAndFees);
        setTotal(calculatedTotal);
      } else {
        setDays(undefined);
        setSubtotal(undefined);
        setTaxesAndFees(undefined);
        setTotal(undefined);
      }
    },
    [pricePerDay]
  );

  // Handle form submission - create reservation and open WhatsApp
  async function onSubmit(values: FormData) {
    const { location, checkin, checkout } = values;

    if (!car.id || !car.location_id) {
      toast.error("Car information is incomplete");
      return;
    }

    const selectedLocation = locations.find((l) => l.value === location);
    if (!selectedLocation) {
      toast.error("Please select a valid location");
      return;
    }

    const calculatedDays = differenceInDays(checkout, checkin);
    const calculatedSubtotal = pricePerDay * calculatedDays;
    const calculatedTaxesAndFees = calculatedSubtotal * 0.16;
    const calculatedTotal = calculatedSubtotal + calculatedTaxesAndFees;

    setIsLoading(true);

    try {
      const result = await createReservation({
        carId: car.id,
        locationId: car.location_id,
        checkIn: checkin,
        checkOut: checkout,
        carName: car.name,
        carSlug: car.slug,
        locationName: selectedLocation.name,
        pricePerDay,
        totalDays: calculatedDays,
        subtotal: calculatedSubtotal,
        taxesAndFees: calculatedTaxesAndFees,
        total: calculatedTotal,
        currency,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.success && result.whatsappUrl) {
        toast.success("Reservation created!", {
          description: "Opening WhatsApp to confirm...",
        });

        // Small delay to show toast before opening WhatsApp
        setTimeout(() => {
          window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
        }, 500);
      } else {
        toast.error("Failed to generate WhatsApp link");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Watch for date changes and recalculate
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "checkin" || name === "checkout") {
        const checkin = value.checkin as Date | undefined;
        const checkout = value.checkout as Date | undefined;
        calculateTotal(checkin, checkout);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, calculateTotal]);

  // Load initial values from URL
  React.useEffect(() => {
    const location = searchParams.get(SearchParams.LOCATION);
    const checkin = searchParams.get(SearchParams.CHECKIN);
    const checkout = searchParams.get(SearchParams.CHECKOUT);

    if (location) form.setValue("location", location);
    if (checkin) {
      const date = new Date(checkin);
      form.setValue("checkin", date);
    }
    if (checkout) {
      const date = new Date(checkout);
      form.setValue("checkout", date);
    }

    // Calculate totals if both dates are present
    if (checkin && checkout) {
      calculateTotal(new Date(checkin), new Date(checkout));
    }

    return () => {
      form.resetField("location");
      form.resetField("checkin");
      form.resetField("checkout");
    };
  }, [searchParams, form, calculateTotal]);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="mt-6 w-full rounded-xl border">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => {
                const selectedLocation = locations.find(
                  ({ value }) => value === field.value
                );
                const isReadOnly = !!field.value;

                return (
                  <FormItem className="relative space-y-0">
                    <FormLabel className="absolute left-2.5 top-2.5 text-xs font-bold">
                      Pick-up / Drop-off
                    </FormLabel>

                    {isReadOnly ?
                      <div className="text-muted-foreground flex h-[58px] w-full flex-col justify-end truncate border-b p-2.5 text-left text-sm">
                        {selectedLocation?.name}
                      </div>
                    : <Popover
                        open={locationOpen}
                        onOpenChange={setLocationOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <button
                              type="button"
                              aria-label="select location"
                              className="text-muted-foreground hover:text-foreground flex h-[58px] w-full flex-col justify-end truncate border-b p-2.5 text-left text-sm duration-200"
                            >
                              {selectedLocation?.name ?? "Select location"}
                            </button>
                          </FormControl>
                        </PopoverTrigger>

                        <PopoverContent className="p-0">
                          <Command>
                            <CommandInput placeholder="Search location..." />
                            <CommandList>
                              <CommandEmpty>No place found.</CommandEmpty>
                              <CommandGroup>
                                {locations.map(({ name, value }) => (
                                  <CommandItem
                                    key={value}
                                    value={name}
                                    onSelect={() => {
                                      form.setValue("location", value);
                                      setLocationOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 size-4 shrink-0",
                                        value === field.value ?
                                          "opacity-100"
                                        : "opacity-0"
                                      )}
                                    />
                                    {name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    }
                  </FormItem>
                );
              }}
            />

            <div className="grid grid-cols-2">
              <FormField
                control={form.control}
                name="checkin"
                render={({ field }) => (
                  <FormItem className="relative space-y-0 border-r">
                    <FormLabel className="absolute left-2.5 top-2.5 text-xs font-bold leading-none">
                      Check in
                    </FormLabel>

                    <Popover open={checkinOpen} onOpenChange={setCheckinOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground flex h-14 w-full flex-col justify-end truncate p-2.5 text-left text-sm duration-200"
                          >
                            {field.value ?
                              format(field.value, "dd/MM/yyyy")
                            : <span>Pick a date</span>}
                          </button>
                        </FormControl>
                      </PopoverTrigger>

                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          autoFocus
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setCheckinOpen(false);
                            // Recalculate if checkout exists
                            const checkout = form.getValues("checkout");
                            if (date && checkout) {
                              calculateTotal(date, checkout);
                            }
                          }}
                          disabled={(date) => date <= new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkout"
                render={({ field }) => (
                  <FormItem className="relative space-y-0">
                    <FormLabel className="absolute left-2.5 top-2.5 text-xs font-bold leading-none">
                      Check out
                    </FormLabel>

                    <Popover open={checkoutOpen} onOpenChange={setCheckoutOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground flex h-14 w-full flex-col justify-end truncate p-2.5 text-left text-sm duration-200"
                          >
                            {field.value ?
                              format(field.value, "dd/MM/yyyy")
                            : <span>Pick a date</span>}
                          </button>
                        </FormControl>
                      </PopoverTrigger>

                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          autoFocus
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setCheckoutOpen(false);
                            // Recalculate if checkin exists
                            const checkin = form.getValues("checkin");
                            if (checkin && date) {
                              calculateTotal(checkin, date);
                            }
                          }}
                          disabled={(date) => date <= addDays(new Date(), 1)}
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div
            aria-live="polite"
            className="mx-auto mt-2 flex w-full flex-wrap items-center justify-between space-y-1 text-xs font-medium text-red-500"
          >
            {form.formState.errors.location && (
              <p>{form.formState.errors.location.message}</p>
            )}
            {form.formState.errors.checkin && (
              <p>{form.formState.errors.checkin.message}</p>
            )}
            {form.formState.errors.checkout && (
              <p>{form.formState.errors.checkout.message}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-4 w-full text-base"
            disabled={isLoading}
          >
            {isLoading ?
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Processing...
              </>
            : "Reserve via WhatsApp"}
          </Button>
        </form>
      </Form>

      <p className="text-muted-foreground mt-4 text-center text-sm">
        You won&apos;t be charged yet
      </p>

      <hr className="my-4" />

      <div className="text-muted-foreground mt-4">
        <div className="flex items-center justify-between">
          <p>
            {formatCurrency(pricePerDay, currency)} x {days ? days : "—"}{" "}
            {days ?
              days > 1 ?
                "days"
              : "day"
            : "days"}{" "}
          </p>
          <p>{subtotal ? formatCurrency(subtotal, currency) : "—"}</p>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <p>Taxes and fees</p>
          <p>{taxesAndFees ? formatCurrency(taxesAndFees, currency) : "—"}</p>
        </div>

        <hr className="my-4" />

        <div className="text-foreground flex items-center justify-between font-semibold">
          <p>Total (taxes included)</p>
          <p>{total ? formatCurrency(total, currency) : "—"}</p>
        </div>
      </div>
    </>
  );
}
