import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupTestAuth, isAuthenticated } from "./testAuth";
import session from "express-session";
import connectPg from "connect-pg-simple";
import {
  insertCompanySchema,
  insertClientSchema,
  insertCategorySchema,
  insertTransactionSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'test-secret-key-for-development',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for local development
      maxAge: sessionTtl,
    },
  }));

  // Auth middleware
  await setupTestAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Company routes
  app.get('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companies = await storage.getUserCompanies(userId);
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companyData = insertCompanySchema.parse({ ...req.body, ownerId: userId });
      const company = await storage.createCompany(companyData);
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.get('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companyId = parseInt(req.params.id);
      const company = await storage.getCompany(companyId, userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companyId = parseInt(req.params.companyId);
      const dashboard = await storage.getDashboardData(companyId, userId);
      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Transaction routes
  app.get('/api/transactions/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companyId = parseInt(req.params.companyId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const transactions = await storage.getTransactions(companyId, userId, page, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionData = insertTransactionSchema.parse({ ...req.body, createdBy: userId });
      const transaction = await storage.createTransaction(transactionData, userId);
      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.put('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionId = parseInt(req.params.id);
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.updateTransaction(transactionId, transactionData, userId);
      res.json(transaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  app.delete('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionId = parseInt(req.params.id);
      await storage.deleteTransaction(transactionId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Client routes
  app.get('/api/clients/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companyId = parseInt(req.params.companyId);
      const clients = await storage.getClients(companyId, userId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData, userId);
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Category routes
  app.get('/api/categories/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companyId = parseInt(req.params.companyId);
      const categories = await storage.getCategories(companyId, userId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData, userId);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Invoice routes
  app.get('/api/invoices/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companyId = parseInt(req.params.companyId);
      const invoices = await storage.getInvoices(companyId, userId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { invoice, items } = req.body;
      const invoiceData = insertInvoiceSchema.parse({ ...invoice, createdBy: userId });
      // Don't validate invoiceId for items since it will be added in storage
      const invoiceItems = items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      }));
      const createdInvoice = await storage.createInvoice(invoiceData, invoiceItems, userId);
      res.json(createdInvoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.get('/api/invoices/:id/details', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoiceDetails(invoiceId, userId);
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      res.status(500).json({ message: "Failed to fetch invoice details" });
    }
  });

  // Reports routes
  app.get('/api/reports/profit-loss/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companyId = parseInt(req.params.companyId);
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const report = await storage.getProfitLossReport(companyId, userId, startDate, endDate);
      res.json(report);
    } catch (error) {
      console.error("Error generating profit/loss report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.get('/api/reports/cash-flow/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companyId = parseInt(req.params.companyId);
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const report = await storage.getCashFlowReport(companyId, userId, startDate, endDate);
      res.json(report);
    } catch (error) {
      console.error("Error generating cash flow report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
