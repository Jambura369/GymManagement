import React, {useState} from 'react';
import {Image, View} from 'react-native';
import {Avatar} from 'react-native-paper';
import {COLORS} from '../../constants';

interface Props {
  uri: string | null | undefined;
  name: string;
  size: number;
  color?: string;
}

const AvatarWithFallback: React.FC<Props> = ({
  uri,
  name,
  size,
  color = COLORS.primary,
}) => {
  const [error, setError] = useState(false);

  if (uri && !error) {
    return (
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
