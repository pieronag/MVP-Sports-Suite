// react-native-maps no tiene versión web: en la vista previa web los mapas no se dibujan.
const React = require('react');
const { View } = require('react-native');
const Stub = React.forwardRef((props, ref) => React.createElement(View, { ref, style: [{ backgroundColor: '#0f172a' }, props.style] }, props.children));
module.exports = Stub;
module.exports.default = Stub;
module.exports.Marker = () => null;
module.exports.Circle = () => null;
module.exports.Callout = () => null;
module.exports.Polyline = () => null;
module.exports.PROVIDER_GOOGLE = 'google';
module.exports.PROVIDER_DEFAULT = undefined;
