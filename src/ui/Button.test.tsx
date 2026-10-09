import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './Button';

it('is disabled and ignores presses while loading', async () => {
  const onPress = jest.fn();
  await render(<Button title="Save" onPress={onPress} loading />);

  const button = screen.getByRole('button', { name: 'Save' });
  expect(button).toBeDisabled();
  await fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
});

it('calls onPress when enabled', async () => {
  const onPress = jest.fn();
  await render(<Button title="Save" onPress={onPress} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
