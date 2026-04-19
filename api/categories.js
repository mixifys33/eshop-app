// Mock API endpoint for categories
// In a real app, this would be handled by your backend server

const CATEGORIES_DATA = {
  success: true,
  categories: [
    "Electronics", 
    "Fashion", 
    "Home & Garden", 
    "Health & Beauty",
    "Sports & Outdoors", 
    "Automotive", 
    "Food & Beverages",
    "Office Supplies", 
    "Industrial", 
    "Agriculture"
  ],
  subCategories: {
    "Electronics": ["Phones", "Laptops", "Tablets", "Accessories", "Gaming", "Audio & Video"],
    "Fashion": ["Men's Clothing", "Women's Clothing", "Shoes", "Bags", "Jewelry", "Watches"],
    "Home & Garden": ["Furniture", "Kitchen", "Bedding", "Decor", "Garden Tools", "Lighting"],
    "Health & Beauty": ["Skincare", "Makeup", "Hair Care", "Personal Care", "Supplements", "Medical"],
    "Sports & Outdoors": ["Fitness", "Camping", "Cycling", "Team Sports", "Water Sports", "Winter Sports"],
    "Automotive": ["Car Parts", "Accessories", "Tools", "Oils & Fluids", "Tires", "Electronics"],
    "Food & Beverages": ["Snacks", "Beverages", "Groceries", "Organic", "Frozen", "Dairy"],
    "Office Supplies": ["Stationery", "Furniture", "Electronics", "Storage", "Paper", "Writing"],
    "Industrial": ["Tools", "Safety Equipment", "Raw Materials", "Machinery", "Electrical", "Plumbing"],
    "Agriculture": ["Seeds", "Fertilizers", "Equipment", "Livestock", "Irrigation", "Pesticides"]
  }
};

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Simulate API delay
    setTimeout(() => {
      res.status(200).json(CATEGORIES_DATA);
    }, 100);
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}