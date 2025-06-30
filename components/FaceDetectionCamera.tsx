import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as MediaLibrary from 'expo-media-library';
import { 
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor 
} from 'react-native-vision-camera';
import { 
  Face,
  useFaceDetector,
  FaceDetectionOptions
} from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';

const { width, height } = Dimensions.get('window');

// 辅助线类型
type GridType = 'none' | 'rule-of-thirds' | 'golden-ratio';

export default function FaceDetectionCamera() {
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [gridType, setGridType] = useState<GridType>('none');
  const [detectedFaces, setDetectedFaces] = useState<Face[]>([]);
  const [activeFaceGrid, setActiveFaceGrid] = useState<number | null>(null);
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(facing);
  const cameraRef = useRef<Camera>(null);
  const router = useRouter();

  // 人脸检测配置
  const faceDetectionOptions = useRef<FaceDetectionOptions>({
    performanceMode: 'fast',
    landmarkMode: 'none',
    contourMode: 'none',
    classificationMode: 'none',
    minFaceSize: 0.1,
    trackingEnabled: false,
  }).current;

  const { detectFaces } = useFaceDetector(faceDetectionOptions);

  // 请求权限
  useEffect(() => {
    (async () => {
      if (!hasPermission) {
        await requestPermission();
      }
    })();
  }, [hasPermission, requestPermission]);

  // 计算人脸在九宫格中的位置
  const getFaceGridPosition = useCallback((face: Face): number => {
    const { bounds } = face;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // 计算在九宫格中的位置 (1-9)
    const gridX = Math.floor((centerX / width) * 3);
    const gridY = Math.floor((centerY / height) * 3);
    
    // 确保在有效范围内
    const clampedX = Math.max(0, Math.min(2, gridX));
    const clampedY = Math.max(0, Math.min(2, gridY));
    
    return clampedY * 3 + clampedX + 1;
  }, []);

  // 处理检测到的人脸
  const handleDetectedFaces = Worklets.createRunOnJS((faces: Face[]) => {
    setDetectedFaces(faces);
    
    if (faces.length > 0) {
      // 找到最大的人脸（最前方的人）
      const largestFace = faces.reduce((prev, current) => 
        (prev.bounds.width * prev.bounds.height) > (current.bounds.width * current.bounds.height) 
          ? prev : current
      );
      
      const gridPosition = getFaceGridPosition(largestFace);
      setActiveFaceGrid(gridPosition);
    } else {
      setActiveFaceGrid(null);
    }
  });

  // 人脸检测帧处理器
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    try {
      const faces = detectFaces(frame);
      handleDetectedFaces(faces);
    } catch (error) {
      console.error('Face detection error:', error);
    }
  }, [handleDetectedFaces, detectFaces]);

  // 权限检查
  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>需要相机权限才能进行人脸识别</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>授权相机</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>找不到相机设备</Text>
      </View>
    );
  }

  // 切换前后摄像头
  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  // 循环切换辅助线类型
  function toggleGrid() {
    setGridType(current => {
      switch (current) {
        case 'none':
          return 'rule-of-thirds';
        case 'rule-of-thirds':
          return 'golden-ratio';
        case 'golden-ratio':
          return 'none';
        default:
          return 'none';
      }
    });
  }

  // 跳转到相册页面
  function goToGallery() {
    router.push('/explore');
  }

  // 拍照功能
  async function takePicture() {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePhoto();
        
        if (photo) {
          // 检查媒体库权限
          if (!mediaLibraryPermission?.granted) {
            const permission = await requestMediaLibraryPermission();
            if (!permission.granted) {
              Alert.alert('权限错误', '需要相册访问权限才能保存照片');
              return;
            }
          }

          // 保存照片到相册
          await MediaLibrary.saveToLibraryAsync(`file://${photo.path}`);
          Alert.alert('成功', '照片已保存到相册！');
        }
      } catch (error) {
        console.error('拍照错误:', error);
        Alert.alert('错误', '拍照失败，请重试');
      }
    }
  }

  // 九宫格辅助线组件（三分法则）
  const RuleOfThirdsGrid = () => {
    return (
      <View style={styles.gridContainer}>
        {/* 垂直线 */}
        <View style={[styles.gridLine, styles.verticalLine, { left: '33.33%' }]} />
        <View style={[styles.gridLine, styles.verticalLine, { left: '66.66%' }]} />
        
        {/* 水平线 */}
        <View style={[styles.gridLine, styles.horizontalLine, { top: '33.33%' }]} />
        <View style={[styles.gridLine, styles.horizontalLine, { top: '66.66%' }]} />
      </View>
    );
  };

  // 黄金分割线组件
  const GoldenRatioGrid = () => {
    const goldenRatio = 0.618;
    const complementRatio = 1 - goldenRatio;
    
    return (
      <View style={styles.gridContainer}>
        {/* 垂直黄金分割线 */}
        <View style={[styles.gridLine, styles.verticalLine, styles.goldenLine, { left: `${goldenRatio * 100}%` }]} />
        <View style={[styles.gridLine, styles.verticalLine, styles.goldenLine, { left: `${complementRatio * 100}%` }]} />
        
        {/* 水平黄金分割线 */}
        <View style={[styles.gridLine, styles.horizontalLine, styles.goldenLine, { top: `${goldenRatio * 100}%` }]} />
        <View style={[styles.gridLine, styles.horizontalLine, styles.goldenLine, { top: `${complementRatio * 100}%` }]} />
        
        {/* 黄金螺旋提示点 */}
        <View style={[styles.goldenPoint, { top: `${complementRatio * 100}%`, left: `${complementRatio * 100}%` }]} />
        <View style={[styles.goldenPoint, { top: `${goldenRatio * 100}%`, left: `${goldenRatio * 100}%` }]} />
      </View>
    );
  };

  // 九宫格人脸指示器
  const FaceGridIndicator = () => {
    const gridPositions = [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
      { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
      { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 },
    ];

    return (
      <View style={styles.faceGridContainer}>
        {gridPositions.map((pos, index) => {
          const gridNumber = index + 1;
          const isActive = gridNumber === activeFaceGrid;
          
          return (
            <View
              key={gridNumber}
              style={[
                styles.gridCell,
                {
                  top: `${(pos.row * 100) / 3 + 10}%`,
                  left: `${(pos.col * 100) / 3 + 10}%`,
                  width: `${100 / 3 - 20}%`,
                  height: `${100 / 3 - 20}%`,
                },
                isActive && styles.activeGridCell
              ]}
            >
              {isActive && (
                <View style={styles.faceIndicator}>
                  <IconSymbol name="person.fill" size={24} color="#00FF00" />
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // 辅助线渲染
  const GridLines = () => {
    switch (gridType) {
      case 'rule-of-thirds':
        return <RuleOfThirdsGrid />;
      case 'golden-ratio':
        return <GoldenRatioGrid />;
      default:
        return null;
    }
  };

  // 获取按钮颜色和图标
  const getGridButtonProps = () => {
    switch (gridType) {
      case 'rule-of-thirds':
        return { color: '#FFD700', icon: 'grid' as const };
      case 'golden-ratio':
        return { color: '#FF6B35', icon: 'target' as const };
      default:
        return { color: 'white', icon: 'grid' as const };
    }
  };

  const { color: buttonColor, icon: buttonIcon } = getGridButtonProps();

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        ref={cameraRef}
        frameProcessor={frameProcessor}
        photo={true}
      >
        {/* 辅助线 */}
        <GridLines />
        
        {/* 人脸九宫格指示器 */}
        <FaceGridIndicator />
        
        {/* 顶部控制栏 */}
        <View style={styles.topControls}>
          <TouchableOpacity 
            style={[
              styles.topButton, 
              gridType !== 'none' && styles.topButtonActive,
              gridType === 'golden-ratio' && styles.topButtonGolden
            ]} 
            onPress={toggleGrid}
          >
            <IconSymbol name={buttonIcon} size={24} color={buttonColor} />
          </TouchableOpacity>
          
          {/* 辅助线类型提示 */}
          {gridType !== 'none' && (
            <View style={styles.gridTypeIndicator}>
              <Text style={styles.gridTypeText}>
                {gridType === 'rule-of-thirds' ? '三分法' : '黄金分割'}
              </Text>
            </View>
          )}
        </View>

        {/* 人脸检测状态指示 */}
        <View style={styles.faceStatus}>
          <Text style={styles.faceStatusText}>
            {detectedFaces.length > 0 
              ? `检测到 ${detectedFaces.length} 张人脸` 
              : '未检测到人脸'
            }
          </Text>
          {activeFaceGrid && (
            <Text style={styles.faceGridText}>
              主要人脸位置: 第 {activeFaceGrid} 宫格
            </Text>
          )}
        </View>

        {/* 底部控制栏 */}
        <View style={styles.buttonContainer}>
          {/* 切换摄像头按钮 */}
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <IconSymbol name="camera.rotate" size={30} color="white" />
          </TouchableOpacity>
          
          {/* 拍照按钮 */}
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
          
          {/* 相册按钮 */}
          <TouchableOpacity style={styles.galleryButton} onPress={goToGallery}>
            <IconSymbol name="photo.fill" size={30} color="white" />
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
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
  
  // 辅助线相关样式
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  goldenLine: {
    backgroundColor: 'rgba(255, 107, 53, 0.5)',
  },
  verticalLine: {
    width: 1,
    height: '100%',
  },
  horizontalLine: {
    height: 1,
    width: '100%',
  },
  goldenPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 107, 53, 0.8)',
    transform: [{ translateX: -3 }, { translateY: -3 }],
  },

  // 人脸九宫格指示器
  faceGridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  gridCell: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeGridCell: {
    borderColor: '#00FF00',
    borderWidth: 3,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  faceIndicator: {
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
    borderRadius: 20,
    padding: 8,
  },

  // 人脸检测状态
  faceStatus: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 12,
    zIndex: 3,
  },
  faceStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  faceGridText: {
    color: '#00FF00',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  
  // 顶部控制栏
  topControls: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 3,
    alignItems: 'flex-end',
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  topButtonGolden: {
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
  },
  gridTypeIndicator: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  gridTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // 底部控制栏
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 30,
    zIndex: 3,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 