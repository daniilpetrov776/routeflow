import { type User, type InsertUser, type Route, type InsertRoute } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getRoute(id: string): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  getUserRoutes(userId: string): Promise<Route[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private routes: Map<string, Route>;

  constructor() {
    this.users = new Map();
    this.routes = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getRoute(id: string): Promise<Route | undefined> {
    return this.routes.get(id);
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const id = randomUUID();
    const route: Route = { 
      ...insertRoute, 
      id,
      routeData: insertRoute.routeData || null,
      createdAt: new Date()
    };
    this.routes.set(id, route);
    return route;
  }

  async getUserRoutes(userId: string): Promise<Route[]> {
    return Array.from(this.routes.values());
  }
}

export const storage = new MemStorage();
