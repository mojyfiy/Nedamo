import {
  users,
  companies,
  companyMembers,
  clients,
  categories,
  transactions,
  invoices,
  invoiceItems,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Client,
  type InsertClient,
  type Category,
  type InsertCategory,
  type Transaction,
  type InsertTransaction,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, sum, count } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company operations
  getUserCompanies(userId: string): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  getCompany(companyId: number, userId: string): Promise<Company | undefined>;
  
  // Dashboard operations
  getDashboardData(companyId: number, userId: string): Promise<any>;
  
  // Transaction operations
  getTransactions(companyId: number, userId: string, page: number, limit: number): Promise<any>;
  createTransaction(transaction: InsertTransaction, userId: string): Promise<Transaction>;
  updateTransaction(transactionId: number, transaction: InsertTransaction, userId: string): Promise<Transaction>;
  deleteTransaction(transactionId: number, userId: string): Promise<void>;
  
  // Client operations
  getClients(companyId: number, userId: string): Promise<Client[]>;
  createClient(client: InsertClient, userId: string): Promise<Client>;
  
  // Category operations
  getCategories(companyId: number, userId: string): Promise<Category[]>;
  createCategory(category: InsertCategory, userId: string): Promise<Category>;
  
  // Invoice operations
  getInvoices(companyId: number, userId: string): Promise<any[]>;
  createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[], userId: string): Promise<Invoice>;
  getInvoiceDetails(invoiceId: number, userId: string): Promise<any>;
  
  // Report operations
  getProfitLossReport(companyId: number, userId: string, startDate: string, endDate: string): Promise<any>;
  getCashFlowReport(companyId: number, userId: string, startDate: string, endDate: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Check if user has access to company
  private async hasCompanyAccess(companyId: number, userId: string): Promise<boolean> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) return false;
    
    if (company.ownerId === userId) return true;
    
    const [member] = await db
      .select()
      .from(companyMembers)
      .where(and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.userId, userId)
      ));
    
    return !!member;
  }

  // Company operations
  async getUserCompanies(userId: string): Promise<Company[]> {
    // Get companies owned by user
    const ownedCompanies = await db
      .select()
      .from(companies)
      .where(eq(companies.ownerId, userId));
    
    // Get companies where user is a member
    const memberCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        logo: companies.logo,
        currency: companies.currency,
        taxRate: companies.taxRate,
        address: companies.address,
        phone: companies.phone,
        email: companies.email,
        website: companies.website,
        ownerId: companies.ownerId,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
      })
      .from(companies)
      .innerJoin(companyMembers, eq(companies.id, companyMembers.companyId))
      .where(eq(companyMembers.userId, userId));
    
    return [...ownedCompanies, ...memberCompanies];
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db
      .insert(companies)
      .values(company)
      .returning();
    
    // Create default categories
    const defaultCategories = [
      { companyId: newCompany.id, name: "مبيعات", type: "income", description: "إيرادات المبيعات" },
      { companyId: newCompany.id, name: "خدمات", type: "income", description: "إيرادات الخدمات" },
      { companyId: newCompany.id, name: "رواتب", type: "expense", description: "رواتب الموظفين" },
      { companyId: newCompany.id, name: "إيجار", type: "expense", description: "إيجار المكتب" },
      { companyId: newCompany.id, name: "مواد خام", type: "expense", description: "مواد خام ومستلزمات" },
      { companyId: newCompany.id, name: "تسويق", type: "expense", description: "مصاريف التسويق والإعلان" },
    ];
    
    await db.insert(categories).values(defaultCategories);
    
    return newCompany;
  }

  async getCompany(companyId: number, userId: string): Promise<Company | undefined> {
    if (!(await this.hasCompanyAccess(companyId, userId))) {
      return undefined;
    }
    
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    return company;
  }

  // Dashboard operations
  async getDashboardData(companyId: number, userId: string): Promise<any> {
    if (!(await this.hasCompanyAccess(companyId, userId))) {
      throw new Error("Unauthorized");
    }

    // Get current month transactions for summary
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Calculate financial summary
    const [incomeResult] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        eq(transactions.companyId, companyId),
        eq(transactions.type, "income"),
        gte(transactions.date, startOfMonth.toISOString().split('T')[0]),
        lte(transactions.date, endOfMonth.toISOString().split('T')[0])
      ));

    const [expenseResult] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        eq(transactions.companyId, companyId),
        eq(transactions.type, "expense"),
        gte(transactions.date, startOfMonth.toISOString().split('T')[0]),
        lte(transactions.date, endOfMonth.toISOString().split('T')[0])
      ));

    const totalRevenue = Number(incomeResult?.total || 0);
    const totalExpenses = Number(expenseResult?.total || 0);
    const netProfit = totalRevenue - totalExpenses;

    // Get outstanding invoices
    const [outstandingResult] = await db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(and(
        eq(invoices.companyId, companyId),
        eq(invoices.status, "sent")
      ));

    const outstandingInvoices = Number(outstandingResult?.total || 0);

    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.date,
        category: {
          name: categories.name,
        },
        client: {
          name: clients.name,
        },
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(clients, eq(transactions.clientId, clients.id))
      .where(eq(transactions.companyId, companyId))
      .orderBy(desc(transactions.createdAt))
      .limit(5);

    // Get chart data for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const chartData = await db
      .select({
        month: sql`EXTRACT(MONTH FROM ${transactions.date})`,
        year: sql`EXTRACT(YEAR FROM ${transactions.date})`,
        type: transactions.type,
        total: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(
        eq(transactions.companyId, companyId),
        gte(transactions.date, sixMonthsAgo.toISOString().split('T')[0])
      ))
      .groupBy(sql`EXTRACT(MONTH FROM ${transactions.date})`, sql`EXTRACT(YEAR FROM ${transactions.date})`, transactions.type)
      .orderBy(sql`EXTRACT(YEAR FROM ${transactions.date})`, sql`EXTRACT(MONTH FROM ${transactions.date})`);

    return {
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        outstandingInvoices,
      },
      recentTransactions,
      charts: {
        revenue: chartData.filter(d => d.type === 'income'),
        expenses: chartData.filter(d => d.type === 'expense'),
      },
      alerts: [
        {
          type: "warning",
          title: "فواتير متأخرة",
          description: "لديك 3 فواتير متأخرة السداد",
          action: "عرض التفاصيل"
        },
        {
          type: "info",
          title: "انتهاء صلاحية الاشتراك",
          description: "ينتهي اشتراكك في 30 يناير",
          action: "تجديد الآن"
        },
        {
          type: "success",
          title: "النسخ الاحتياطي",
          description: "تمت العملية بنجاح اليوم"
        }
      ]
    };
  }

  // Transaction operations
  async getTransactions(companyId: number, userId: string, page: number, limit: number): Promise<any> {
    if (!(await this.hasCompanyAccess(companyId, userId))) {
      throw new Error("Unauthorized");
    }

    const offset = (page - 1) * limit;

    const transactionsList = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.date,
        attachmentUrl: transactions.attachmentUrl,
        createdAt: transactions.createdAt,
        category: {
          id: categories.id,
          name: categories.name,
        },
        client: {
          id: clients.id,
          name: clients.name,
        },
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(clients, eq(transactions.clientId, clients.id))
      .where(eq(transactions.companyId, companyId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.companyId, companyId));

    return {
      transactions: transactionsList,
      total: totalCount.count,
      page,
      limit,
    };
  }

  async createTransaction(transaction: InsertTransaction, userId: string): Promise<Transaction> {
    if (!(await this.hasCompanyAccess(transaction.companyId, userId))) {
      throw new Error("Unauthorized");
    }

    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();

    return newTransaction;
  }

  async updateTransaction(transactionId: number, transaction: InsertTransaction, userId: string): Promise<Transaction> {
    if (!(await this.hasCompanyAccess(transaction.companyId, userId))) {
      throw new Error("Unauthorized");
    }

    const [updatedTransaction] = await db
      .update(transactions)
      .set({ ...transaction, updatedAt: new Date() })
      .where(eq(transactions.id, transactionId))
      .returning();

    return updatedTransaction;
  }

  async deleteTransaction(transactionId: number, userId: string): Promise<void> {
    const [existingTransaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!existingTransaction || !(await this.hasCompanyAccess(existingTransaction.companyId, userId))) {
      throw new Error("Unauthorized");
    }

    await db
      .delete(transactions)
      .where(eq(transactions.id, transactionId));
  }

  // Client operations
  async getClients(companyId: number, userId: string): Promise<Client[]> {
    if (!(await this.hasCompanyAccess(companyId, userId))) {
      throw new Error("Unauthorized");
    }

    return await db
      .select()
      .from(clients)
      .where(eq(clients.companyId, companyId))
      .orderBy(clients.name);
  }

  async createClient(client: InsertClient, userId: string): Promise<Client> {
    if (!(await this.hasCompanyAccess(client.companyId, userId))) {
      throw new Error("Unauthorized");
    }

    const [newClient] = await db
      .insert(clients)
      .values(client)
      .returning();

    return newClient;
  }

  // Category operations
  async getCategories(companyId: number, userId: string): Promise<Category[]> {
    if (!(await this.hasCompanyAccess(companyId, userId))) {
      throw new Error("Unauthorized");
    }

    return await db
      .select()
      .from(categories)
      .where(eq(categories.companyId, companyId))
      .orderBy(categories.name);
  }

  async createCategory(category: InsertCategory, userId: string): Promise<Category> {
    if (!(await this.hasCompanyAccess(category.companyId, userId))) {
      throw new Error("Unauthorized");
    }

    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();

    return newCategory;
  }

  // Invoice operations
  async getInvoices(companyId: number, userId: string): Promise<any[]> {
    if (!(await this.hasCompanyAccess(companyId, userId))) {
      throw new Error("Unauthorized");
    }

    return await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        subtotal: invoices.subtotal,
        taxAmount: invoices.taxAmount,
        total: invoices.total,
        notes: invoices.notes,
        createdAt: invoices.createdAt,
        client: {
          id: clients.id,
          name: clients.name,
          email: clients.email,
        },
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.companyId, companyId))
      .orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[], userId: string): Promise<Invoice> {
    if (!(await this.hasCompanyAccess(invoice.companyId, userId))) {
      throw new Error("Unauthorized");
    }

    const [newInvoice] = await db
      .insert(invoices)
      .values(invoice)
      .returning();

    const invoiceItemsWithId = items.map(item => ({
      ...item,
      invoiceId: newInvoice.id,
    }));

    await db.insert(invoiceItems).values(invoiceItemsWithId);

    return newInvoice;
  }

  async getInvoiceDetails(invoiceId: number, userId: string): Promise<any> {
    const [invoice] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        subtotal: invoices.subtotal,
        taxAmount: invoices.taxAmount,
        total: invoices.total,
        notes: invoices.notes,
        companyId: invoices.companyId,
        client: {
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          address: clients.address,
        },
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.id, invoiceId));

    if (!invoice || !(await this.hasCompanyAccess(invoice.companyId, userId))) {
      throw new Error("Unauthorized");
    }

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    return {
      ...invoice,
      items,
    };
  }

  // Report operations
  async getProfitLossReport(companyId: number, userId: string, startDate: string, endDate: string): Promise<any> {
    if (!(await this.hasCompanyAccess(companyId, userId))) {
      throw new Error("Unauthorized");
    }

    const incomeTransactions = await db
      .select({
        categoryName: categories.name,
        total: sum(transactions.amount),
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.companyId, companyId),
        eq(transactions.type, "income"),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      ))
      .groupBy(categories.name);

    const expenseTransactions = await db
      .select({
        categoryName: categories.name,
        total: sum(transactions.amount),
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.companyId, companyId),
        eq(transactions.type, "expense"),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      ))
      .groupBy(categories.name);

    const totalIncome = incomeTransactions.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const totalExpenses = expenseTransactions.reduce((sum, item) => sum + Number(item.total || 0), 0);

    return {
      period: { startDate, endDate },
      income: incomeTransactions,
      expenses: expenseTransactions,
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
    };
  }

  async getCashFlowReport(companyId: number, userId: string, startDate: string, endDate: string): Promise<any> {
    if (!(await this.hasCompanyAccess(companyId, userId))) {
      throw new Error("Unauthorized");
    }

    const cashFlow = await db
      .select({
        date: transactions.date,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.companyId, companyId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      ))
      .orderBy(transactions.date);

    let runningBalance = 0;
    const flowWithBalance = cashFlow.map(item => {
      const amount = Number(item.amount);
      if (item.type === 'income') {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }
      return {
        ...item,
        runningBalance,
      };
    });

    return {
      period: { startDate, endDate },
      cashFlow: flowWithBalance,
      finalBalance: runningBalance,
    };
  }
}

export const storage = new DatabaseStorage();
