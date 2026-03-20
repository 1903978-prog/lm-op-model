import {
  type Destination, type InsertDestination,
  type Task, type InsertTask,
  type Trip, type InsertTrip,
  type TripTask, type InsertTripTask,
  type Deadline, type InsertDeadline,
  type DeadlineCategory, type InsertDeadlineCategory,
  type TdlTask, type InsertTdlTask,
  type Friend, type InsertFriend,
  type Place, type InsertPlace,
  destinations, tasks, trips, tripTasks, deadlines, deadlineCategories, tdlTasks, friends, places,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export interface IStorage {
  getDestinations(): Promise<Destination[]>;
  getDestination(id: string): Promise<Destination | undefined>;
  createDestination(dest: InsertDestination): Promise<Destination>;
  updateDestination(id: string, dest: Partial<InsertDestination>): Promise<Destination | undefined>;
  deleteDestination(id: string): Promise<void>;

  getTasks(): Promise<Task[]>;
  getTasksByDestination(destinationId: string): Promise<Task[]>;
  getGlobalTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;

  getTrips(): Promise<Trip[]>;
  getTrip(id: string): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: string, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: string): Promise<void>;

  getTripTasks(tripId: string): Promise<TripTask[]>;
  createTripTask(tripTask: InsertTripTask): Promise<TripTask>;
  updateTripTask(id: string, data: Partial<InsertTripTask>): Promise<TripTask | undefined>;
  deleteTripTasksByTrip(tripId: string): Promise<void>;

  getDeadlines(): Promise<Deadline[]>;
  getDeadline(id: string): Promise<Deadline | undefined>;
  createDeadline(deadline: InsertDeadline): Promise<Deadline>;
  updateDeadline(id: string, deadline: Partial<InsertDeadline>): Promise<Deadline | undefined>;
  deleteDeadline(id: string): Promise<void>;

  getDeadlineCategories(): Promise<DeadlineCategory[]>;
  createDeadlineCategory(cat: InsertDeadlineCategory): Promise<DeadlineCategory>;
  deleteDeadlineCategory(id: string): Promise<void>;

  getTdlTasks(): Promise<TdlTask[]>;
  createTdlTask(task: InsertTdlTask): Promise<TdlTask>;
  updateTdlTask(id: string, data: Partial<InsertTdlTask>): Promise<TdlTask | undefined>;
  deleteTdlTask(id: string): Promise<void>;

  getFriends(): Promise<Friend[]>;
  createFriend(friend: InsertFriend): Promise<Friend>;
  updateFriend(id: string, data: Partial<InsertFriend>): Promise<Friend | undefined>;
  deleteFriend(id: string): Promise<void>;

  getPlaces(): Promise<Place[]>;
  createPlace(place: InsertPlace): Promise<Place>;
  deletePlace(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getDestinations(): Promise<Destination[]> {
    return db.select().from(destinations);
  }

  async getDestination(id: string): Promise<Destination | undefined> {
    const [dest] = await db.select().from(destinations).where(eq(destinations.id, id));
    return dest;
  }

  async createDestination(dest: InsertDestination): Promise<Destination> {
    const [created] = await db.insert(destinations).values(dest).returning();
    return created;
  }

  async updateDestination(id: string, dest: Partial<InsertDestination>): Promise<Destination | undefined> {
    const [updated] = await db.update(destinations).set(dest).where(eq(destinations.id, id)).returning();
    return updated;
  }

  async deleteDestination(id: string): Promise<void> {
    await db.delete(destinations).where(eq(destinations.id, id));
  }

  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks);
  }

  async getTasksByDestination(destinationId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.destinationId, destinationId));
  }

  async getGlobalTasks(): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.isGlobal, true));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getTrips(): Promise<Trip[]> {
    return db.select().from(trips);
  }

  async getTrip(id: string): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip;
  }

  async createTrip(trip: InsertTrip): Promise<Trip> {
    const [created] = await db.insert(trips).values(trip).returning();
    return created;
  }

  async updateTrip(id: string, trip: Partial<InsertTrip>): Promise<Trip | undefined> {
    const [updated] = await db.update(trips).set(trip).where(eq(trips.id, id)).returning();
    return updated;
  }

  async deleteTrip(id: string): Promise<void> {
    await db.delete(trips).where(eq(trips.id, id));
  }

  async getTripTasks(tripId: string): Promise<TripTask[]> {
    return db.select().from(tripTasks).where(eq(tripTasks.tripId, tripId));
  }

  async createTripTask(tripTask: InsertTripTask): Promise<TripTask> {
    const [created] = await db.insert(tripTasks).values(tripTask).returning();
    return created;
  }

  async updateTripTask(id: string, data: Partial<InsertTripTask>): Promise<TripTask | undefined> {
    const [updated] = await db.update(tripTasks).set(data).where(eq(tripTasks.id, id)).returning();
    return updated;
  }

  async deleteTripTasksByTrip(tripId: string): Promise<void> {
    await db.delete(tripTasks).where(eq(tripTasks.tripId, tripId));
  }

  async getDeadlines(): Promise<Deadline[]> {
    return db.select().from(deadlines);
  }

  async getDeadline(id: string): Promise<Deadline | undefined> {
    const [row] = await db.select().from(deadlines).where(eq(deadlines.id, id));
    return row;
  }

  async createDeadline(deadline: InsertDeadline): Promise<Deadline> {
    const [created] = await db.insert(deadlines).values(deadline).returning();
    return created;
  }

  async updateDeadline(id: string, deadline: Partial<InsertDeadline>): Promise<Deadline | undefined> {
    const [updated] = await db.update(deadlines).set(deadline).where(eq(deadlines.id, id)).returning();
    return updated;
  }

  async deleteDeadline(id: string): Promise<void> {
    await db.delete(deadlines).where(eq(deadlines.id, id));
  }

  async getDeadlineCategories(): Promise<DeadlineCategory[]> {
    return db.select().from(deadlineCategories).orderBy(deadlineCategories.name);
  }

  async createDeadlineCategory(cat: InsertDeadlineCategory): Promise<DeadlineCategory> {
    const [created] = await db.insert(deadlineCategories).values(cat).returning();
    return created;
  }

  async deleteDeadlineCategory(id: string): Promise<void> {
    await db.delete(deadlineCategories).where(eq(deadlineCategories.id, id));
  }

  async getTdlTasks(): Promise<TdlTask[]> {
    return db.select().from(tdlTasks).orderBy(tdlTasks.priority, tdlTasks.createdAt);
  }

  async createTdlTask(task: InsertTdlTask): Promise<TdlTask> {
    const [created] = await db.insert(tdlTasks).values(task).returning();
    return created;
  }

  async updateTdlTask(id: string, data: Partial<InsertTdlTask>): Promise<TdlTask | undefined> {
    const [updated] = await db.update(tdlTasks).set(data).where(eq(tdlTasks.id, id)).returning();
    return updated;
  }

  async deleteTdlTask(id: string): Promise<void> {
    await db.delete(tdlTasks).where(eq(tdlTasks.id, id));
  }

  async getFriends(): Promise<Friend[]> {
    return db.select().from(friends).orderBy(friends.lastSpoke);
  }

  async createFriend(friend: InsertFriend): Promise<Friend> {
    const [created] = await db.insert(friends).values(friend).returning();
    return created;
  }

  async updateFriend(id: string, data: Partial<InsertFriend>): Promise<Friend | undefined> {
    const [updated] = await db.update(friends).set(data).where(eq(friends.id, id)).returning();
    return updated;
  }

  async deleteFriend(id: string): Promise<void> {
    await db.delete(friends).where(eq(friends.id, id));
  }

  async getPlaces(): Promise<Place[]> {
    return db.select().from(places).orderBy(places.name);
  }

  async createPlace(place: InsertPlace): Promise<Place> {
    const [created] = await db.insert(places).values(place).returning();
    return created;
  }

  async deletePlace(id: string): Promise<void> {
    await db.delete(places).where(eq(places.id, id));
  }
}

export const storage = new DatabaseStorage();
