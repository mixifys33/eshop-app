// Simple test to verify download utility works
import { downloadFile } from '../downloadUtils';

// Mock Platform for testing
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web'
  },
  Alert: {
    alert: jest.fn()
  },
  Linking: {
    openURL: jest.fn()
  }
}));

// Mock global fetch for web testing
global.fetch = jest.fn();
global.window = {
  URL: {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn()
  }
};
global.document = {
  createElement: jest.fn(() => ({
    href: '',
    download: '',
    click: jest.fn(),
    remove: jest.fn()
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

describe('downloadFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle web download successfully', async () => {
    const mockBlob = new Blob(['test content']);
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(mockBlob)
    });

    const result = await downloadFile('http://test.com/file.xlsx', 'test.xlsx');

    expect(result.success).toBe(true);
    expect(result.platform).toBe('web');
    expect(fetch).toHaveBeenCalledWith('http://test.com/file.xlsx', {
      method: 'GET',
      headers: {}
    });
  });

  test('should handle download failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    const result = await downloadFile('http://test.com/nonexistent.xlsx', 'test.xlsx');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Download failed with status: 404');
  });
});