import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`;

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@emberkitchen.co.za").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeThisBeforeProduction123!";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: { name: "Ember Admin", email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: "ADMIN" },
  });
  await prisma.restaurantSettings.upsert({ where: { id: "main" }, update: {}, create: { id: "main", restaurantName: "Ember Kitchen", deliveryFee: 25 } });

  const initial = [
    ["Burgers","The Ember Burger",115,"Flame-grilled beef, mature cheddar, caramelised onions and our smoky house sauce on a toasted brioche bun. Served with golden fries.","photo-1568901346375-23c9450c58cd","HOUSE FAVOURITE","Wheat, milk, eggs","extra cheese"],
    ["Pizza","Margherita, made right",99,"Slow-fermented dough, tomato sauce, creamy mozzarella and fresh basil. Baked until beautifully blistered.","photo-1574071318508-1cdbab80d002","VEGETARIAN","Wheat, milk","extra cheese"],
    ["Bowls","The Green Goddess",89,"A bright seasonal bowl of greens, avocado, roasted vegetables and grains with lemon herb dressing.","photo-1512621776951-a57141f2eefd","FEEL-GOOD FOOD","Sesame; ask about seasonal ingredients","avocado"],
    ["Pasta","Sunday tomato pasta",109,"Pasta tossed in slow-cooked tomato sauce with basil, olive oil and parmesan.","photo-1473093295043-cdd812d0e601","COMFORT CLASSIC","Wheat, milk, eggs","extra cheese"],
    ["Dessert","Chocolate happiness",65,"Rich chocolate cake with a soft centre and a silky chocolate finish.","photo-1578985545062-69928b1d9587","SWEET FINISH","Wheat, milk, eggs; may contain nuts","chocolate sauce"],
    ["Drinks","Berry summer cooler",39,"A refreshing berry cooler with crushed ice, citrus and fresh mint. Alcohol-free.","photo-1544145945-f90425340c7e","FRESHLY POURED","Ask about ingredients","berry syrup"],
  ] as const;

  for (let i = 0; i < initial.length; i++) {
    const [categoryName, name, price, description, image, tag, allergens, extraName] = initial[i];
    const category = await prisma.category.upsert({ where: { name: categoryName }, update: { isActive: true, sortOrder: i }, create: { name: categoryName, sortOrder: i } });
    const existing = await prisma.menuItem.findFirst({ where: { name } });
    if (!existing) await prisma.menuItem.create({ data: { name, price, description, imageUrl: photo(image), tag, allergens, extraName, extraPrice: 15, categoryId: category.id, isFeatured: i === 0, sortOrder: i } });
  }
  console.log(`Seeded Ember Kitchen. Admin: ${adminEmail}`);
}
main().finally(() => prisma.$disconnect());
