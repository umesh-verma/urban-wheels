import { and, asc, eq, sql } from "drizzle-orm";

import { db } from ".";
import { env } from "../env";
import * as placeholder from "./placeholder";
import {
  cars,
  locations,
  rentalReservations,
  testimonials,
} from "./schema/tables";

function usePlaceholder() {
  return env.NODE_ENV === "development" && !env.USE_DATABASE;
}

export async function fetchTestimonials() {
  if (usePlaceholder()) {
    return placeholder.testimonials;
  }

  try {
    console.log("Fetching testimonials data...");
    const data = await db.select().from(testimonials);
    console.log("Data fetch complete.");
    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch testimonials data.");
  }
}

export async function fetchLocations() {
  if (usePlaceholder()) {
    return placeholder.locations;
  }

  try {
    console.log("Fetching locations data...");
    const data = await db.select().from(locations).orderBy(asc(locations.name));
    console.log("Data fetch complete.");
    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch locations data.");
  }
}

export async function fetchFeaturedLocations() {
  if (usePlaceholder()) {
    return placeholder.locations.filter((location) => location.featured);
  }

  try {
    console.log("Fetching featured locations data...");
    const data = await db
      .select()
      .from(locations)
      .where(eq(locations.featured, true));
    console.log("Data fetch complete.");
    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch featured locations data.");
  }
}

export async function fetchLocationByValue(value: string) {
  if (usePlaceholder()) {
    return placeholder.locations.find((location) => location.value === value);
  }

  try {
    console.log("Fetching location data...");
    const [data] = await db
      .select()
      .from(locations)
      .where(eq(locations.value, value))
      .limit(1);
    console.log("Data fetch complete.");
    return data;
  } catch (error) {
    console.error("Database Error:", error);
  }
}

export async function fetchCars() {
  if (usePlaceholder()) {
    return placeholder.cars;
  }

  try {
    console.log("Fetching cars data...");
    const data = await db.select().from(cars);
    console.log("Data fetch complete.");
    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch cars data.");
  }
}

export async function fetchCarBySlug(slug: string) {
  if (usePlaceholder()) {
    return placeholder.cars.find((car) => car.slug === slug);
  }

  try {
    const [data] = await db
      .select()
      .from(cars)
      .where(eq(cars.slug, slug))
      .limit(1);
    return data;
  } catch (error) {
    console.error("Database Error:", error);
  }
}

export async function fetchCarsByLocation(locationValue: string) {
  // Find the location by value
  const location = await fetchLocationByValue(locationValue);
  if (!location?.id) {
    return [];
  }

  const locationId = location.id;

  if (usePlaceholder()) {
    return placeholder.cars.filter((car) => car.location_id === locationId);
  }

  try {
    console.log("Fetching cars for location...");
    const data = await db
      .select()
      .from(cars)
      .where(eq(cars.location_id, locationId));
    console.log("Data fetch complete.");
    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch cars by location.");
  }
}

export async function fetchAvailableCars(
  locationValue: string,
  checkIn: Date,
  checkOut: Date
) {
  // Find the location by value
  const location = await fetchLocationByValue(locationValue);
  if (!location?.id) {
    return [];
  }

  const locationId = location.id;

  if (usePlaceholder()) {
    // In development mode, filter placeholder data
    // First filter cars by location, then exclude reserved ones
    const locationCars = placeholder.cars.filter(
      (car) => car.location_id === locationId
    );

    // Find overlapping reservations at this location
    const overlappingReservations = placeholder.rentalReservations.filter(
      (reservation) => {
        if (reservation.location_id !== locationId) return false;
        const resCheckIn = new Date(reservation.check_in);
        const resCheckOut = new Date(reservation.check_out);
        // Check for date overlap: reservation overlaps if it starts before checkOut AND ends after checkIn
        return resCheckIn < checkOut && resCheckOut > checkIn;
      }
    );
    const reservedCarIds = new Set(
      overlappingReservations.map((r) => r.car_id)
    );

    return locationCars.filter((car) => !reservedCarIds.has(car.id!));
  }

  try {
    console.log("Fetching available cars for location and dates...");

    // Find cars that have overlapping reservations at this location
    const overlappingReservations = await db
      .select({ carId: rentalReservations.car_id })
      .from(rentalReservations)
      .where(
        and(
          eq(rentalReservations.location_id, locationId),
          // Check for date overlap: reservation overlaps if it starts before checkOut AND ends after checkIn
          and(
            sql`${rentalReservations.check_in} < ${checkOut.toISOString()}`,
            sql`${rentalReservations.check_out} > ${checkIn.toISOString()}`
          )
        )
      );

    const reservedCarIds = overlappingReservations.map((r) => r.carId);

    // Get cars at this location that are NOT reserved
    if (reservedCarIds.length === 0) {
      // No reservations, return all cars at this location
      const locationCars = await db
        .select()
        .from(cars)
        .where(eq(cars.location_id, locationId));
      return locationCars;
    }

    // Filter out reserved cars at this location
    const availableCars = await db
      .select()
      .from(cars)
      .where(
        and(
          eq(cars.location_id, locationId),
          sql`${cars.id} NOT IN (${reservedCarIds.map((id) => `'${id}'`).join(", ")})`
        )
      );

    console.log("Data fetch complete.");
    return availableCars;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch available cars.");
  }
}

export async function getMinPriceFromCars() {
  if (usePlaceholder()) {
    return placeholder.cars.reduce((min, car) => {
      const price =
        car.discounted_price_per_day || car.retail_price_per_day || 0;
      return price < min ? price : min;
    }, Infinity);
  }

  try {
    const query = sql`
      SELECT
        MIN(COALESCE(discounted_price_per_day, retail_price_per_day)) AS min_price
      FROM urban_wheels_cars;
    `;

    const data = await db.execute(query);

    return data[0].min_price as number;
  } catch (error) {
    console.error("Database Error:", error);
  }
}
