import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const imageSize = (width - 30) / 3; // 3列网格布局

export default function ExploreScreen() {
  const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const router = useRouter();

  useEffect(() => {
    getPhotos();
  }, []);

  // 跳转到相机页面
  function goToCamera() {
    router.push('/');
  }

  const getPhotos = async () => {
    try {
      // 检查权限
      if (!mediaLibraryPermission?.granted) {
        const permission = await requestMediaLibraryPermission();
        if (!permission.granted) {
          setHasPermission(false);
          return;
        }
      }
      
      setHasPermission(true);
      
      // 获取相册中的照片
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: 'creationTime',
        first: 100,
      });
      
      setPhotos(assets);
    } catch (error) {
      console.error('获取照片失败:', error);
      Alert.alert('错误', '无法加载照片');
    }
  };

  const renderPhoto = ({ item }: { item: MediaLibrary.Asset }) => (
    <TouchableOpacity style={styles.photoContainer}>
      <Image
        source={{ uri: item.uri }}
        style={styles.photo}
        contentFit="cover"
      />
    </TouchableOpacity>
  );

  if (hasPermission === false) {
    return (
      <ThemedView style={styles.permissionContainer}>
        <ThemedText style={styles.permissionText}>
          需要相册访问权限才能查看照片
        </ThemedText>
        <TouchableOpacity style={styles.permissionButton} onPress={getPhotos}>
          <Text style={styles.permissionButtonText}>授权访问</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <View style={styles.headerTop}>
          <ThemedText type="title">我的相册</ThemedText>
          <TouchableOpacity style={styles.cameraButton} onPress={goToCamera}>
            <IconSymbol name="camera.fill" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.photoCount}>
          共 {photos.length} 张照片
        </ThemedText>
      </ThemedView>
      
      {photos.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>暂无照片</ThemedText>
          <ThemedText style={styles.emptySubText}>
            点击右上角相机图标去拍一些照片吧！
          </ThemedText>
          <TouchableOpacity style={styles.goToCameraButton} onPress={goToCamera}>
            <IconSymbol name="camera.fill" size={20} color="white" />
            <Text style={styles.goToCameraText}>打开相机</Text>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.photoList}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      <TouchableOpacity style={styles.refreshButton} onPress={getPhotos}>
        <Text style={styles.refreshButtonText}>刷新</Text>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  cameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  photoList: {
    paddingHorizontal: 10,
  },
  photoContainer: {
    margin: 5,
  },
  photo: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
  },
  goToCameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  goToCameraText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
