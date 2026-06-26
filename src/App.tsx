import {
  AppBar,
  Box,
  Button,
  createTheme,
  CssBaseline,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemText,
  NativeSelect,
  Switch,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
} from '@mui/material';

import '@fontsource-variable/noto-sans-sc/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import { useRef, useState } from 'react';
import { useImmer } from 'use-immer';

interface LagrangeConfigBase {
  '$schema': string;
  Logging: { LogLevel: { Default: string } };
  SignServerUrl: string;
  SignProxyUrl: string;
  SignServer: {
    Mode: string;
    StrictNativeTier: boolean;
    UseSyntheticProfile: boolean;
    EnableStatusRegister: boolean;
    IncludeRawStatePushHex: boolean;
    AdvancedProbeTimeoutMs: number;
    StatePushTimeoutMs: number;
  };
  Diagnostics: {
    EnableFileLogging: boolean;
    LogDirectory: string;
  };
  Database: {
    Enable: boolean;
  };
  MusicSignServerUrl: string;
  Account: {
    Uin: number;
    Password: string;
    Protocol: string;
    AutoReconnect: boolean;
    GetOptimumServer: boolean;
  };
  Message: {
    IgnoreSelf: boolean;
    StringPost: boolean;
  };
  QrCode: {
    ConsoleCompatibilityMode: boolean;
  };
}

type Implementation =
  | ReverseWebSocketImplementation
  | ForwardWebSocketImplementation
  | HttpPostImplementation
  | HttpImplementation;

interface ReverseWebSocketImplementation {
  Type: 'ReverseWebSocket';
  Host: string;
  Port: number;
  Suffix: string;
  ReconnectInterval: number;
  HeartBeatInterval: number;
  AccessToken: string;
}

interface ForwardWebSocketImplementation {
  Type: 'ForwardWebSocket';
  Host: string;
  Port: number;
  HeartBeatInterval: number;
  HeartBeatEnable: boolean;
  AccessToken: string;
}

interface HttpPostImplementation {
  Type: 'HttpPost';
  Host: string;
  Port: number;
  Suffix: string;
  HeartBeatInterval: number;
  HeartBeatEnable: boolean;
  AccessToken: string;
  Secret: string;
}

interface HttpImplementation {
  Type: 'Http';
  Host: string;
  Port: number;
  AccessToken: string;
}

interface SignServerOption {
  id: string;
  group: string;
  name: string;
  url: string;
  note: string;
}

const signServerOptions: SignServerOption[] = [
  {
    id: 'stable-de',
    group: '版本 49738',
    name: '雪桃-港缘主环',
    url: 'https://de.seal-sign.xuetao.host/49738',
    note: '香港：低延迟，无限流量，但偶尔被扫段，请主用（运行代价轻）',
  },
  {
    id: 'stable-cf',
    group: '版本 49738',
    name: '雪桃-云界律域',
    url: 'https://cf-seal-sign.xuetao.host/49738',
    note: 'Cloudflare反代：海外很快，大陆转圈圈，适合备用。（运行代价轻）',
  },
  {
    id: 'stable-cdn',
    group: '版本 49738',
    name: '雪桃-寰网引路',
    url: 'https://seal-sign.xuetao.host/49738',
    note: '【其他稳请优先用其他】全球CDN入口：亚太CDN对华，Cloudflare对国际。低延迟，稳定。（运行代价高）',
  },
  {
    id: 'experimental-cf',
    group: '试验',
    name: '雪桃-试验-云界律域',
    url: 'https://xn--qq-xd1e168a.xn--ihqq5fcwac6y.ren/experimental',
    note: 'Cloudflare反代。纯试验签名，常重启改动，且需要配合雪桃改版Lagrange使用，并提交日志给雪桃。请加入QQ群83306954获取详情。',
  },
  {
    id: 'experimental-cdn',
    group: '试验',
    name: '雪桃-寰网引路',
    url: 'https://seal-sign.xuetao.host/49738',
    note: '全球CDN入口。纯试验签名，常重启改动，且需要配合雪桃改版Lagrange使用，并提交日志给雪桃。请加入QQ群83306954获取详情。',
  },
];

const defaultSignServer = signServerOptions[0];

const theme = createTheme({
  typography: {
    fontFamily: ['"Inter"', '"Noto Sans SC Variable"', 'sans-serif'].join(','),
  },
  palette: {
    mode: 'light',
    background: { default: '#f9f9f9' },
    text: { primary: 'rgba(0,0,0,0.825)' },
  },
});

function App() {
  const nextImplKey = useRef(0);
  const [selectedSignServer, setSelectedSignServer] = useState(defaultSignServer.id);
  const [configBase, setConfigBase] = useImmer<LagrangeConfigBase>({
    '$schema': 'https://raw.githubusercontent.com/LoranaAurelia/Lagrange.Core/master/Lagrange.OneBot/Resources/appsettings_schema.json',
    Logging: { LogLevel: { Default: 'Information' } },
    SignServerUrl: defaultSignServer.url,
    SignProxyUrl: '',
    SignServer: {
      Mode: 'native-body-online',
      StrictNativeTier: false,
      UseSyntheticProfile: true,
      EnableStatusRegister: false,
      IncludeRawStatePushHex: false,
      AdvancedProbeTimeoutMs: 1500,
      StatePushTimeoutMs: 1000,
    },
    Diagnostics: {
      EnableFileLogging: false,
      LogDirectory: 'logs',
    },
    Database: {
      Enable: false,
    },
    MusicSignServerUrl: '',
    Account: {
      Uin: 0,
      Password: '',
      Protocol: 'Linux',
      AutoReconnect: true,
      GetOptimumServer: true,
    },
    Message: {
      IgnoreSelf: true,
      StringPost: false,
    },
    QrCode: {
      ConsoleCompatibilityMode: false,
    },
  });

  const [impls, setImpls] = useImmer<{ key: number; config: Implementation }[]>([
    {
      key: -1,
      config: {
        Type: 'ReverseWebSocket',
        Host: '127.0.0.1',
        Port: 8080,
        Suffix: '/onebot/v11/ws',
        ReconnectInterval: 5000,
        HeartBeatInterval: 5000,
        AccessToken: '',
      },
    },
  ]);

  const selectedSignServerOption = signServerOptions.find(option => option.id === selectedSignServer);
  const signServerGroups = Array.from(new Set(signServerOptions.map(option => option.group)));

  const updateImpl = (index: number, patch: Partial<Implementation>) => {
    setImpls(draft => {
      draft[index].config = { ...draft[index].config, ...patch } as Implementation;
    });
  };

  const configJson = JSON.stringify({
    ...configBase,
    Implementations: impls.map(({ config }) => config),
  }, null, 4);

  return <ThemeProvider theme={theme}><CssBaseline />
    <AppBar position={'fixed'} sx={{ zIndex: currentTheme => currentTheme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant={'h6'} style={{ userSelect: 'none' }} flexGrow={1}>
          <b>Lagrange Config Generator</b>
        </Typography>
        <Button sx={{ color: 'white' }} href={'https://lagrangedev.github.io/Lagrange.Doc/Lagrange.OneBot/Config/'}>
          配置文档
        </Button>
      </Toolbar>
    </AppBar>
    <Box display={'flex'} flexDirection={'column'} height={'100vh'}>
      <Toolbar />
      <Box id={'detail'} display={'flex'} flexGrow={1}>
        <Box width={0.6}>
          <List sx={{ paddingX: 3, paddingY: 2 }}>
            <ListItemText primary={'日志设置'} secondary={'有关日志等级的设定'} />
            <ListItem>
              <ListItemText primary={'默认日志等级'} secondary={'如需上报 Issue 请设置为 Trace'} />
              <NativeSelect
                value={configBase.Logging.LogLevel.Default}
                onChange={e => setConfigBase(draft => { draft.Logging.LogLevel.Default = e.target.value; })}
                sx={{ minWidth: 0.3 }}
                variant={'outlined'}
              >
                {['Trace', 'Debug', 'Information', 'Warning', 'Error', 'Critical', 'None'].map(item =>
                  <option key={`Logging.LogLevel.Default=${item}`} value={item}>{item}</option>)
                }
              </NativeSelect>
            </ListItem>
          </List>
          <Divider />
          <List sx={{ paddingX: 3, paddingY: 2 }}>
            <ListItemText primary={'签名设置'} secondary={'有关签名服务的设定'} />
            <ListItem>
              <ListItemText primary={'签名服务预设'} secondary={selectedSignServerOption?.note ?? '使用自定义签名服务地址'} />
              <NativeSelect
                value={selectedSignServer}
                onChange={e => {
                  const value = e.target.value;
                  setSelectedSignServer(value);
                  const option = signServerOptions.find(item => item.id === value);
                  if (option) setConfigBase(draft => { draft.SignServerUrl = option.url; });
                }}
                sx={{ minWidth: 0.5 }}
                variant={'outlined'}
              >
                {signServerGroups.map(group =>
                  <optgroup key={`sign-server-group-${group}`} label={group}>
                    {signServerOptions
                      .filter(option => option.group === group)
                      .map(option => <option key={`SignServerUrl=${option.id}`} value={option.id}>{option.name}</option>)}
                  </optgroup>)
                }
                <option value={'custom'}>自定义</option>
              </NativeSelect>
            </ListItem>
            <ListItem>
              <ListItemText primary={'签名服务地址'} secondary={'可使用预设，也可以手动填入自建签名服务'} />
              <TextField
                value={configBase.SignServerUrl}
                onChange={e => setConfigBase(draft => {
                  setSelectedSignServer('custom');
                  draft.SignServerUrl = e.target.value;
                })}
                sx={{ width: 0.5 }}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'签名代理服务地址'} secondary={'仅支持 HTTP 代理，例如 http://127.0.0.1:7890'} />
              <TextField
                value={configBase.SignProxyUrl}
                onChange={e => setConfigBase(draft => { draft.SignProxyUrl = e.target.value; })}
                sx={{ width: 0.5 }}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'音乐卡片签名服务地址'} />
              <TextField
                value={configBase.MusicSignServerUrl}
                onChange={e => setConfigBase(draft => { draft.MusicSignServerUrl = e.target.value; })}
                sx={{ width: 0.5 }}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'SignServer Mode'} secondary={'高级签名端点行为'} />
              <NativeSelect
                value={configBase.SignServer.Mode}
                onChange={e => setConfigBase(draft => { draft.SignServer.Mode = e.target.value; })}
                sx={{ minWidth: 0.3 }}
                variant={'outlined'}
              >
                <option value={'legacy'}>legacy</option>
                <option value={'log-only'}>log-only</option>
                <option value={'native-body-online'}>native-body-online</option>
                <option value={'strict'}>strict</option>
              </NativeSelect>
            </ListItem>
            <ListItem>
              <ListItemText primary={'StrictNativeTier'} secondary={'SignServer 返回的 native_tier 不符合预期时失败'} />
              <Switch
                checked={configBase.SignServer.StrictNativeTier}
                onChange={e => setConfigBase(draft => { draft.SignServer.StrictNativeTier = e.target.checked; })}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'UseSyntheticProfile'} secondary={'使用持久化合成 Linux 设备画像'} />
              <Switch
                checked={configBase.SignServer.UseSyntheticProfile}
                onChange={e => setConfigBase(draft => { draft.SignServer.UseSyntheticProfile = e.target.checked; })}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'EnableStatusRegister'} secondary={'诊断用途，默认关闭'} />
              <Switch
                checked={configBase.SignServer.EnableStatusRegister}
                onChange={e => setConfigBase(draft => { draft.SignServer.EnableStatusRegister = e.target.checked; })}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'IncludeRawStatePushHex'} secondary={'仅调试包字节时开启'} />
              <Switch
                checked={configBase.SignServer.IncludeRawStatePushHex}
                onChange={e => setConfigBase(draft => { draft.SignServer.IncludeRawStatePushHex = e.target.checked; })}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'AdvancedProbeTimeoutMs'} secondary={'单位为毫秒'} />
              <TextField
                value={configBase.SignServer.AdvancedProbeTimeoutMs}
                onChange={e => setConfigBase(draft => { draft.SignServer.AdvancedProbeTimeoutMs = parseInt(e.target.value) || 0; })}
                sx={{ width: 0.3 }}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'StatePushTimeoutMs'} secondary={'单位为毫秒'} />
              <TextField
                value={configBase.SignServer.StatePushTimeoutMs}
                onChange={e => setConfigBase(draft => { draft.SignServer.StatePushTimeoutMs = parseInt(e.target.value) || 0; })}
                sx={{ width: 0.3 }}
              />
            </ListItem>
          </List>
          <Divider />
          <List sx={{ paddingX: 3, paddingY: 2 }}>
            <ListItemText primary={'账号设置'} secondary={'有关账号信息的设定'} />
            <ListItem>
              <ListItemText primary={'Uin'} secondary={'用于识别数据库和二维码文件'} />
              <TextField
                value={configBase.Account.Uin}
                onChange={e => setConfigBase(draft => { draft.Account.Uin = parseInt(e.target.value) || 0; })}
                sx={{ width: 0.3 }}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'密码'} secondary={'不再支持'} />
              <TextField
                value={configBase.Account.Password}
                onChange={e => setConfigBase(draft => { draft.Account.Password = e.target.value; })}
                sx={{ width: 0.3 }}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'协议'} />
              <NativeSelect
                value={configBase.Account.Protocol}
                onChange={e => setConfigBase(draft => { draft.Account.Protocol = e.target.value; })}
                sx={{ minWidth: 0.3 }}
                variant={'outlined'}
              >
                <option value={'Linux'}>Linux</option>
                <option value={'Windows'}>Windows</option>
                <option value={'MacOs'}>macOS</option>
              </NativeSelect>
            </ListItem>
            <ListItem>
              <ListItemText primary={'自动重连'} />
              <Switch
                checked={configBase.Account.AutoReconnect}
                onChange={e => setConfigBase(draft => { draft.Account.AutoReconnect = e.target.checked; })}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'获取最优服务器'} />
              <Switch
                checked={configBase.Account.GetOptimumServer}
                onChange={e => setConfigBase(draft => { draft.Account.GetOptimumServer = e.target.checked; })}
              />
            </ListItem>
          </List>
          <Divider />
          <List sx={{ paddingX: 3, paddingY: 2 }}>
            <ListItemText primary={'消息设置'} secondary={'有关消息上报的设定'} />
            <ListItem>
              <ListItemText primary={'忽略自身消息'} />
              <Switch
                checked={configBase.Message.IgnoreSelf}
                onChange={e => setConfigBase(draft => { draft.Message.IgnoreSelf = e.target.checked; })}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'上报为 CQ 码'} secondary={'例如 [CQ:at,qq=114514] 早上好'} />
              <Switch
                checked={configBase.Message.StringPost}
                onChange={e => setConfigBase(draft => { draft.Message.StringPost = e.target.checked; })}
              />
            </ListItem>
          </List>
          <Divider />
          <List sx={{ paddingX: 3, paddingY: 2 }}>
            <ListItemText primary={'诊断与数据库'} secondary={'有关运行日志、抓包和 Realm 数据库的设定'} />
            <ListItem>
              <ListItemText primary={'启用文件日志'} secondary={'同步输出 runtime log 和 unsupported SSO packet dumps'} />
              <Switch
                checked={configBase.Diagnostics.EnableFileLogging}
                onChange={e => setConfigBase(draft => { draft.Diagnostics.EnableFileLogging = e.target.checked; })}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'日志目录'} />
              <TextField
                value={configBase.Diagnostics.LogDirectory}
                onChange={e => setConfigBase(draft => { draft.Diagnostics.LogDirectory = e.target.value; })}
                sx={{ width: 0.3 }}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary={'启用数据库'} secondary={'启用 Realm-backed message lookup；默认关闭'} />
              <Switch
                checked={configBase.Database.Enable}
                onChange={e => setConfigBase(draft => { draft.Database.Enable = e.target.checked; })}
              />
            </ListItem>
          </List>
          <Divider />
          <List sx={{ paddingX: 3, paddingY: 2 }}>
            <ListItemText primary={'二维码设置'} secondary={'有关登录二维码显示的设定'} />
            <ListItem>
              <ListItemText primary={'控制台兼容模式'} secondary={'当二维码显示异常可尝试启用'} />
              <Switch
                checked={configBase.QrCode.ConsoleCompatibilityMode}
                onChange={e => setConfigBase(draft => { draft.QrCode.ConsoleCompatibilityMode = e.target.checked; })}
              />
            </ListItem>
          </List>
          <Divider />
          <List sx={{ paddingX: 3, paddingY: 2 }}>
            <ListItem disablePadding={true}>
              <ListItemText primary={'服务设置'} secondary={'有关 Lagrange.OneBot 网络服务的设定'} />
            </ListItem>
            <ListItem disablePadding={true}>
              <Button onClick={() => {
                setImpls(draft => {
                  draft.push({
                    key: nextImplKey.current++,
                    config: { Type: 'Http', Host: '*', Port: 8083, AccessToken: '' },
                  });
                });
              }}>新建 HTTP 服务</Button>
              <Button onClick={() => {
                setImpls(draft => {
                  draft.push({
                    key: nextImplKey.current++,
                    config: {
                      Type: 'HttpPost',
                      Host: '127.0.0.1',
                      Port: 8082,
                      Suffix: '/',
                      HeartBeatInterval: 5000,
                      HeartBeatEnable: true,
                      AccessToken: '',
                      Secret: '',
                    },
                  });
                });
              }}>新建 HTTP Post 服务</Button>
              <Button onClick={() => {
                setImpls(draft => {
                  draft.push({
                    key: nextImplKey.current++,
                    config: {
                      Type: 'ForwardWebSocket',
                      Host: '127.0.0.1',
                      Port: 8081,
                      HeartBeatInterval: 5000,
                      HeartBeatEnable: true,
                      AccessToken: '',
                    },
                  });
                });
              }}>新建 WebSocket 服务</Button>
              <Button onClick={() => {
                setImpls(draft => {
                  draft.push({
                    key: nextImplKey.current++,
                    config: {
                      Type: 'ReverseWebSocket',
                      Host: '127.0.0.1',
                      Port: 8080,
                      Suffix: '/onebot/v11/ws',
                      ReconnectInterval: 5000,
                      HeartBeatInterval: 5000,
                      AccessToken: '',
                    },
                  });
                });
              }}>新建反向 WebSocket 服务</Button>
            </ListItem>
            {impls.map(({ key, config }, index) => <List key={key} sx={{ padding: 2, marginY: 1 }}>
              <ListItem disablePadding={true}>
                <ListItemText primary={`${config.Type} 服务`} />
                <Button onClick={() => setImpls(draft => { draft.splice(index, 1); })}>移除</Button>
              </ListItem>
              <ListItem>
                <ListItemText primary={'Host'} />
                <TextField
                  value={config.Host}
                  onChange={e => updateImpl(index, { Host: e.target.value })}
                  sx={{ width: 0.3 }}
                />
              </ListItem>
              <ListItem>
                <ListItemText primary={'Port'} />
                <TextField
                  value={config.Port}
                  onChange={e => updateImpl(index, { Port: parseInt(e.target.value) || 0 })}
                  sx={{ width: 0.3 }}
                />
              </ListItem>
              {'Suffix' in config && <ListItem>
                <ListItemText primary={'Suffix'} />
                <TextField
                  value={config.Suffix}
                  onChange={e => updateImpl(index, { Suffix: e.target.value } as Partial<Implementation>)}
                  sx={{ width: 0.3 }}
                />
              </ListItem>}
              {'ReconnectInterval' in config && <ListItem>
                <ListItemText primary={'ReconnectInterval'} secondary={'单位为毫秒'} />
                <TextField
                  value={config.ReconnectInterval}
                  onChange={e => updateImpl(index, { ReconnectInterval: parseInt(e.target.value) || 0 } as Partial<Implementation>)}
                  sx={{ width: 0.3 }}
                />
              </ListItem>}
              {'HeartBeatInterval' in config && <ListItem>
                <ListItemText primary={'HeartBeatInterval'} secondary={'单位为毫秒'} />
                <TextField
                  value={config.HeartBeatInterval}
                  onChange={e => updateImpl(index, { HeartBeatInterval: parseInt(e.target.value) || 0 } as Partial<Implementation>)}
                  sx={{ width: 0.3 }}
                />
              </ListItem>}
              {'HeartBeatEnable' in config && <ListItem>
                <ListItemText primary={'HeartBeatEnable'} />
                <Switch
                  checked={config.HeartBeatEnable}
                  onChange={e => updateImpl(index, { HeartBeatEnable: e.target.checked } as Partial<Implementation>)}
                />
              </ListItem>}
              <ListItem>
                <ListItemText primary={'Access Token'} />
                <TextField
                  value={config.AccessToken}
                  onChange={e => updateImpl(index, { AccessToken: e.target.value })}
                  sx={{ width: 0.5 }}
                />
              </ListItem>
              {'Secret' in config && <ListItem>
                <ListItemText primary={'Secret'} secondary={'用于给 HTTP Post 请求签名'} />
                <TextField
                  value={config.Secret}
                  onChange={e => updateImpl(index, { Secret: e.target.value } as Partial<Implementation>)}
                  sx={{ width: 0.5 }}
                />
              </ListItem>}
            </List>)}
          </List>
          <Box display={'flex'} flexDirection={'column'} alignItems={'center'} gap={1} justifyContent={'center'} paddingY={1}>
            <Typography variant={'caption'}>
              Copyright {new Date().getFullYear()} Lagrange.Dev
            </Typography>
          </Box>
        </Box>
        <Drawer
          sx={{
            width: 0.4,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 0.4,
              boxSizing: 'border-box',
              padding: 3,
            },
          }}
          variant="permanent"
          anchor="right"
        >
          <Toolbar />
          <Box display={'flex'} marginBottom={2}>
            <Button variant={'contained'} onClick={() => {
              void navigator.clipboard.writeText(configJson);
            }}>复制到剪贴板</Button>
          </Box>
          <TextField
            multiline={true}
            fullWidth={true}
            value={configJson}
            inputProps={{
              sx: {
                fontFamily: ['"JetBrains Mono Variable"', '"Noto Sans SC Variable"', 'monospace'],
                fontSize: 12,
              },
            }}
          />
        </Drawer>
      </Box>
    </Box>
  </ThemeProvider>;
}

export default App;
