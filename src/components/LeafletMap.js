import { Platform } from 'react-native';

const LeafletMap = Platform.OS === 'web'
  ? require('./LeafletMap.web').default
  : require('./LeafletMap.native').default;

export default LeafletMap;
