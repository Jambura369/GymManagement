import React, {useState} from 'react';
import {Image, View, TouchableOpacity} from 'react-native';
import {Avatar} from 'react-native-paper';
import {COLORS} from '../../constants';
import ImageViewerModal from './ImageViewerModal';

interface Props {
  uri: string | null | undefined;
  name: string;
  size: number;
  color?: string;
  /** When true (default), tapping a real photo opens a full-screen viewer. */
  viewable?: boolean;
}

const AvatarWithFallback: React.FC<Props> = ({
  uri,
  name,
  size,
  color = COLORS.primary,
  viewable = true,
}) => {
  const [error, setError] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);

  if (uri && !error) {
    const image = (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: color + '30',
        }}>
        <Image
          source={{uri}}
          style={{width: size, height: size}}
          onError={() => setError(true)}
        />
      </View>
    );

    if (!viewable) return image;

    return (
      <>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setViewerVisible(true)}>
          {image}
        </TouchableOpacity>
        <ImageViewerModal
          visible={viewerVisible}
          uri={uri}
          onClose={() => setViewerVisible(false)}
        />
      </>
    );
  }

  return (
    <Avatar.Text
      size={size}
      label={name.slice(0, 2).toUpperCase()}
      style={{backgroundColor: color + '30'}}
      labelStyle={{color, fontSize: Math.round(size * 0.32)}}
    />
  );
};

export default AvatarWithFallback;
