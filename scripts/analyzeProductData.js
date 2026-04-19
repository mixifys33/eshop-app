// Script to analyze product data structure
import AsyncStorage from '@react-native-async-storage/async-storage';

const analyzeProductData = async () => {
  try {
    console.log('=== PRODUCT DATA ANALYSIS ===');
    
    // Get sample products from different sources
    const sources = [
      'featuredProducts',
      'newArrivals', 
      'bestSellers',
      'cart',
      'wishlist'
    ];
    
    const allProducts = [];
    
    for (const source of sources) {
      try {
        const data = await AsyncStorage.getItem(source);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            allProducts.push(...parsed);
          }
        }
      } catch (error) {
        console.log(`No data found for ${source}`);
      }
    }
    
    if (allProducts.length === 0) {
      console.log('No products found in storage. Creating sample product structure...');
      
      // Create a comprehensive sample product to understand the structure
      const sampleProduct = {
        id: 'sample_001',
        name: 'Sample Product Name',
        description: 'Detailed product description...',
        price: 25000,
        originalPrice: 30000,
        discount: '17% OFF',
        category: 'Electronics',
        subCategory: 'Smartphones',
        brand: 'Sample Brand',
        model: 'Model X1',
        stock: 50,
        rating: 4.5,
        reviews: 128,
        image: 'https://example.com/image.jpg',
        images: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
          'https://example.com/image3.jpg'
        ],
        specifications: {
          color: 'Black',
          size: 'Medium',
          weight: '200g',
          dimensions: '15x10x2 cm',
          material: 'Premium Plastic',
          warranty: '1 Year'
        },
        features: [
          'High Quality Build',
          'Fast Performance',
          'Long Battery Life',
          'Water Resistant'
        ],
        seller: {
          id: 'seller_001',
          name: 'Tech Store Uganda',
          rating: 4.8,
          location: 'Kampala, Uganda'
        },
        shipping: {
          freeShipping: true,
          estimatedDays: '2-3 days',
          cost: 0
        },
        isNew: true,
        isFeatured: true,
        tags: ['electronics', 'smartphone', 'tech'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      allProducts.push(sampleProduct);
    }
    
    // Analyze the first product to understand structure
    const sampleProduct = allProducts[0];
    
    console.log('\n=== PRODUCT STRUCTURE ANALYSIS ===');
    console.log('Sample Product Keys:', Object.keys(sampleProduct));
    console.log('\nDetailed Structure:');
    
    const analyzeObject = (obj, prefix = '') => {
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          console.log(`${fullKey}: [Object]`);
          analyzeObject(value, fullKey);
        } else if (Array.isArray(value)) {
          console.log(`${fullKey}: [Array] (${value.length} items)`);
          if (value.length > 0) {
            console.log(`  Sample item: ${typeof value[0]} - ${JSON.stringify(value[0]).substring(0, 50)}...`);
          }
        } else {
          console.log(`${fullKey}: ${typeof value} - ${JSON.stringify(value)}`);
        }
      });
    };
    
    analyzeObject(sampleProduct);
    
    console.log('\n=== RECOMMENDED PRODUCT SCREEN SECTIONS ===');
    console.log('1. Image Gallery (carousel with zoom)');
    console.log('2. Product Title & Brand');
    console.log('3. Rating & Reviews Summary');
    console.log('4. Price & Discount Info');
    console.log('5. Stock Status & Availability');
    console.log('6. Product Description');
    console.log('7. Key Features List');
    console.log('8. Specifications Table');
    console.log('9. Seller Information');
    console.log('10. Shipping & Delivery Info');
    console.log('11. Quantity Selector & Add to Cart');
    console.log('12. Related Products');
    console.log('13. Customer Reviews');
    console.log('14. Q&A Section');
    
    return {
      productStructure: sampleProduct,
      totalProducts: allProducts.length,
      availableFields: Object.keys(sampleProduct)
    };
    
  } catch (error) {
    console.error('Error analyzing product data:', error);
    return null;
  }
};

export default analyzeProductData;