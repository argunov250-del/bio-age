import React from 'react';
import { fit } from './fit';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { tr } from './i18n';
import { COLORS, SIZES } from './theme';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null, run: 0 };
  }

  static getDerivedStateFromError(err) {
    return { err };
  }

  render() {
    if (!this.state.err) return <View key={this.state.run} style={{ flex: 1 }}>{this.props.children}</View>;
    const e = this.state.err;
    return (
      <View style={eb.wrap}>
        <Text style={eb.title}>{tr('Что-то пошло не так')}</Text>
        <Text style={eb.text}>{String((e && e.message) || e)}</Text>
        <Pressable onPress={() => this.setState({ err: null, run: this.state.run + 1 })} style={eb.btn}>
          <Text {...fit(1, 0.7)} style={eb.btnText}>{tr('Перезапустить')}</Text>
        </Pressable>
      </View>
    );
  }
}

const eb = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  title: { color: COLORS.text, fontSize: SIZES.title, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  text: { color: COLORS.sub, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 26 },
  btn: { height: SIZES.button, paddingHorizontal: 30, borderRadius: 999, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: COLORS.onPrimary, fontSize: SIZES.text, fontWeight: '700' },
});

export { ErrorBoundary };
