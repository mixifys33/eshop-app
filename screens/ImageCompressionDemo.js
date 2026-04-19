import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert
} from 'react-native';
import ImageUploader from '../components/ImageUploader';

const { width } = Dimensions.get('window');

const ImageCompressionDemo = ({ navigation }) => {
  const [images, setImages] = useState({
    logo: null,
    banner: null,
    product: null,
    thumbnail: null
  });

  const handleImageSelected = (type, image) => {
    setImages(prev => ({ ...prev, [type]: image }));
    
    if (image) {
      console.log(`${type} image selected:`, {
        fileName: image.fileName,
        fileSize: image.fileSize,
        dimensions: `${image.width}x${image.height}`,
        uri: image.uri
      });
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Image Compression Demo</Text>
        <Text style={styles.subtitle}>
          Test different image compression presets and see the results
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏪 Shop Logo</Text>
          <Text style={styles.sectionDescription}>
            Square format, high quality, PNG preferred for transparency
          </Text>
          <ImageUploader
            preset="logo"
            label="Upload Shop Logo"
            hint="400x400px, PNG/JPG, Auto-compressed to 90% quality"
            currentImage={images.logo}
            onImageSelected={(image) => handleImageSelected('logo', image)}
            showCompressionInfo={true}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🖼️ Shop Banner</Text>
          <Text style={styles.sectionDescription}>
            Wide format, good quality, JPEG for smaller file size
          </Text>
          <ImageUploader
            preset="banner"
            label="Upload Shop Banner"
            hint="1200x400px, PNG/JPG, Auto-compressed to 85% quality"
            currentImage={images.banner}
            onImageSelected={(image) => handleImageSelected('banner', image)}
            showCompressionInfo={true}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Product Image</Text>
          <Text style={styles.sectionDescription}>
            Balanced size and quality for product listings
          </Text>
          <ImageUploader
            preset="product"
            label="Upload Product Image"
            hint="800x800px, PNG/JPG, Auto-compressed to 80% quality"
            currentImage={images.product}
            onImageSelected={(image) => handleImageSelected('product', image)}
            showCompressionInfo={true}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Thumbnail</Text>
          <Text style={styles.sectionDescription}>
            Small size for thumbnails and previews
          </Text>
          <ImageUploader
            preset="thumbnail"
            label="Upload Thumbnail"
            hint="200x200px, PNG/JPG, Auto-compressed to 70% quality"
            currentImage={images.thumbnail}
            onImageSelected={(image) => handleImageSelected('thumbnail', image)}
            showCompressionInfo={true}
          />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>📊 Compression Benefits</Text>
          <Text style={styles.infoText}>
            • Reduces file sizes by 30-70% on average{'\n'}
            • Faster upload and download times{'\n'}
            • Less storage space required{'\n'}
            • Better app performance{'\n'}
            • Automatic format optimization{'\n'}
            • Maintains visual quality
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingTop: width > 768 ? 60 : 40,
    paddingHorizontal: width > 768 ? 40 : 20,
    paddingBottom: 40,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: width > 768 ? 32 : 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: width > 768 ? 16 : 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: width > 768 ? 25 : 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: width > 768 ? 20 : 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: width > 768 ? 14 : 13,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: width > 768 ? 25 : 20,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 15,
  },
  infoText: {
    fontSize: width > 768 ? 14 : 13,
    color: '#1976d2',
    lineHeight: 22,
  },
});

export default ImageCompressionDemo;
