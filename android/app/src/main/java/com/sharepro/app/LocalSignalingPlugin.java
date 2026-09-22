package com.sharepro.app;

import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Enumeration;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "LocalSignaling")
public class LocalSignalingPlugin extends Plugin {
    private static final int TCP_PORT = 38490;
    private static final int UDP_PORT = 38491;
    private static final int MAX_BODY_BYTES = 256 * 1024;
    private static final int DEFAULT_DISCOVERY_TIMEOUT_MS = 1400;

    private static final Object SERVER_LOCK = new Object();
    private static LocalServer server;

    @Override
    public void load() {
        super.load();
    }

    @Override
    protected void handleOnDestroy() {
        stopServer();
        super.handleOnDestroy();
    }

    @com.getcapacitor.PluginMethod
    public void startReceiver(PluginCall call) {
        final String room = sanitizeRoom(call.getString("room", ""));
        final String deviceName = sanitizeDeviceName(call.getString("deviceName", "Android Device"));

        if (!room.matches("\\d{6}")) {
            call.reject("रूम कोड 6 अंकों का होना चाहिए");
            return;
        }

        try {
            synchronized (SERVER_LOCK) {
                if (server != null) {
                    server.stop();
                }
                server = new LocalServer(room, deviceName);
                server.start();
            }

            JSObject result = new JSObject();
            result.put("room", room);
            result.put("deviceName", deviceName);
            result.put("deviceType", "mobile");
            result.put("address", "http://" + server.address + ":" + server.port);
            result.put("port", server.port);
            result.put("token", server.token);
            result.put("url", "sharepro://connect?room=" + room
                    + "&address=" + URLEncoder.encode(server.address, "UTF-8")
                    + "&port=" + server.port
                    + "&token=" + URLEncoder.encode(server.token, "UTF-8")
                    + "&name=" + URLEncoder.encode(deviceName, "UTF-8"));
            call.resolve(result);
        } catch (Exception e) {
            stopServer();
            call.reject("स्थानीय रिसीवर शुरू नहीं हो सका: " + e.getMessage(), e);
        }
    }

    @com.getcapacitor.PluginMethod
    public void stopReceiver(PluginCall call) {
        stopServer();
        call.resolve();
    }

    @com.getcapacitor.PluginMethod
    public void discoverReceivers(PluginCall call) {
        final String requestedRoom = sanitizeRoom(call.getString("room", ""));
        int timeout = call.getInt("timeoutMs", DEFAULT_DISCOVERY_TIMEOUT_MS);
        timeout = Math.max(350, Math.min(timeout, 5000));

        ExecutorService executor = Executors.newSingleThreadExecutor();
        executor.execute(() -> {
            try {
                Map<String, JSObject> found = discover(requestedRoom, timeout);
                JSObject result = new JSObject();
                com.getcapacitor.JSArray receivers = new com.getcapacitor.JSArray();
                for (JSObject item : found.values()) {
                    receivers.put(item);
                }
                result.put("receivers", receivers);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("रिसीवर खोजने में समस्या हुई: " + e.getMessage(), e);
            } finally {
                executor.shutdownNow();
            }
        });
    }

    @com.getcapacitor.PluginMethod
    public void postSignal(PluginCall call) {
        final String address = normalizeAddress(call.getString("address", ""));
        final String token = call.getString("token", "");
        final String role = call.getString("role", "sender");
        final JSObject message = call.getObject("message", new JSObject());

        if (address.isEmpty() || token.isEmpty() || !(role.equals("sender") || role.equals("receiver"))) {
            call.reject("सिग्नलिंग विवरण अमान्य है");
            return;
        }

        requestServer(call, "POST", address + "/v1/signal", token, role, message.toString());
    }

    @com.getcapacitor.PluginMethod
    public void pollSignal(PluginCall call) {
        final String address = normalizeAddress(call.getString("address", ""));
        final String token = call.getString("token", "");
        final String role = call.getString("role", "sender");

        if (address.isEmpty() || token.isEmpty() || !(role.equals("sender") || role.equals("receiver"))) {
            call.reject("सिग्नलिंग विवरण अमान्य है");
            return;
        }

        requestServer(call, "GET", address + "/v1/signal?role=" + role, token, role, null);
    }

    private void requestServer(PluginCall call, String method, String target, String token, String role, String body) {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(target);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod(method);
                connection.setConnectTimeout(2200);
                connection.setReadTimeout(2200);
                connection.setUseCaches(false);
                connection.setRequestProperty("X-SP-Token", token);
                connection.setRequestProperty("X-SP-Role", role);
                connection.setRequestProperty("Accept", "application/json");

                if ("POST".equals(method)) {
                    connection.setDoOutput(true);
                    connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    byte[] data = body == null ? new byte[0] : body.getBytes(StandardCharsets.UTF_8);
                    if (data.length > MAX_BODY_BYTES) throw new IOException("सिग्नल बहुत बड़ा है");
                    connection.setFixedLengthStreamingMode(data.length);
                    try (OutputStream out = connection.getOutputStream()) {
                        out.write(data);
                    }
                }

                int status = connection.getResponseCode();
                InputStream stream = status >= 200 && status < 400 ? connection.getInputStream() : connection.getErrorStream();
                String response = readLimited(stream, MAX_BODY_BYTES);
                JSONObject json = response.isEmpty() ? new JSONObject() : new JSONObject(response);

                if (status < 200 || status >= 300) {
                    call.reject(json.optString("error", "सिग्नलिंग सर्वर ने अनुरोध अस्वीकार किया"));
                } else {
                    JSObject result = JSObject.fromJSONObject(json);
                    call.resolve(result);
                }
            } catch (Exception e) {
                call.reject("स्थानीय सिग्नलिंग अनुरोध विफल: " + e.getMessage(), e);
            } finally {
                if (connection != null) connection.disconnect();
                executor.shutdownNow();
            }
        });
    }

    private static String readLimited(InputStream stream, int maxBytes) throws IOException {
        if (stream == null) return "";
        try (InputStream in = stream; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int total = 0;
            int read;
            while ((read = in.read(buffer)) != -1) {
                total += read;
                if (total > maxBytes) throw new IOException("उत्तर बहुत बड़ा है");
                out.write(buffer, 0, read);
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    private static Map<String, JSObject> discover(String requestedRoom, int timeoutMs) throws IOException {
        DatagramSocket socket = new DatagramSocket();
        socket.setBroadcast(true);
        socket.setSoTimeout(Math.max(120, timeoutMs / 3));
        Map<String, JSObject> found = new LinkedHashMap<>();
        String query = requestedRoom.isEmpty() ? "*" : requestedRoom;
        byte[] payload = ("SP2|DISCOVER|" + query).getBytes(StandardCharsets.UTF_8);

        try {
            Set<String> sent = new HashSet<>();
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            if (interfaces != null) {
                while (interfaces.hasMoreElements()) {
                    NetworkInterface ni = interfaces.nextElement();
                    if (!ni.isUp() || ni.isLoopback()) continue;
                    for (java.net.InterfaceAddress ia : ni.getInterfaceAddresses()) {
                        InetAddress broadcast = ia.getBroadcast();
                        if (broadcast == null) continue;
                        String key = broadcast.getHostAddress();
                        if (sent.add(key)) {
                            socket.send(new DatagramPacket(payload, payload.length, broadcast, UDP_PORT));
                        }
                    }
                }
            }
            InetAddress globalBroadcast = InetAddress.getByName("255.255.255.255");
            if (sent.add(globalBroadcast.getHostAddress())) {
                socket.send(new DatagramPacket(payload, payload.length, globalBroadcast, UDP_PORT));
            }

            long deadline = System.currentTimeMillis() + timeoutMs;
            byte[] buffer = new byte[2048];
            while (System.currentTimeMillis() < deadline) {
                try {
                    DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                    socket.receive(packet);
                    String text = new String(packet.getData(), packet.getOffset(), packet.getLength(), StandardCharsets.UTF_8);
                    parseDiscoveryReply(text, packet.getAddress().getHostAddress(), found);
                } catch (java.net.SocketTimeoutException ignored) {
                    // Continue until the overall deadline.
                }
            }
        } finally {
            socket.close();
        }
        return found;
    }

    private static void parseDiscoveryReply(String text, String senderIp, Map<String, JSObject> found) {
        String[] parts = text.split("\\|", 7);
        if (parts.length < 7 || !"SP2".equals(parts[0]) || !"REPLY".equals(parts[1])) return;
        String room = parts[2];
        String token = parts[3];
        String portText = parts[4];
        String deviceName = parts[5];
        String path = parts[6];
        if (!room.matches("\\d{6}") || token.isEmpty()) return;
        int port;
        try { port = Integer.parseInt(portText); } catch (NumberFormatException e) { return; }

        String address = "http://" + senderIp + ":" + port;
        JSObject item = new JSObject();
        item.put("room", room);
        item.put("deviceName", deviceName);
        item.put("deviceType", "mobile");
        item.put("address", address);
        item.put("token", token);
        item.put("url", "sharepro://connect?room=" + room
                + "&address=" + senderIp
                + "&port=" + port
                + "&token=" + urlEncode(token)
                + "&name=" + urlEncode(deviceName));
        found.put(room + "@" + address + path, item);
    }

    private static String urlEncode(String value) {
        try { return URLEncoder.encode(value, "UTF-8"); } catch (Exception e) { return value; }
    }

    private static String sanitizeRoom(String room) {
        return room == null ? "" : room.replaceAll("[^0-9]", "");
    }

    private static String sanitizeDeviceName(String name) {
        String clean = name == null ? "Android Device" : name.trim();
        if (clean.isEmpty()) clean = "Android Device";
        return clean.substring(0, Math.min(clean.length(), 48)).replace("|", " ");
    }

    private static String normalizeAddress(String address) {
        if (address == null) return "";
        String clean = address.trim();
        if (!(clean.startsWith("http://") || clean.startsWith("https://"))) return "";
        while (clean.endsWith("/")) clean = clean.substring(0, clean.length() - 1);
        return clean;
    }

    private static void stopServer() {
        synchronized (SERVER_LOCK) {
            if (server != null) {
                server.stop();
                server = null;
            }
        }
    }

    private static final class LocalServer {
        final String room;
        final String deviceName;
        final String token;
        final ConcurrentLinkedQueue<String> toSender = new ConcurrentLinkedQueue<>();
        final ConcurrentLinkedQueue<String> toReceiver = new ConcurrentLinkedQueue<>();
        final AtomicBoolean running = new AtomicBoolean(false);
        final ExecutorService executor = Executors.newCachedThreadPool();
        ServerSocket serverSocket;
        DatagramSocket discoverySocket;
        Thread httpThread;
        Thread discoveryThread;
        String address;
        int port;

        LocalServer(String room, String deviceName) {
            this.room = room;
            this.deviceName = deviceName;
            this.token = createToken();
        }

        void start() throws IOException {
            try {
                serverSocket = new ServerSocket(TCP_PORT, 32, InetAddress.getByName("0.0.0.0"));
            } catch (IOException fixedPortError) {
                serverSocket = new ServerSocket(0, 32, InetAddress.getByName("0.0.0.0"));
            }
            port = serverSocket.getLocalPort();
            address = findLocalIpv4();
            running.set(true);

            httpThread = new Thread(this::serveHttp, "SharePro-HTTP");
            httpThread.start();

            try {
                discoverySocket = new DatagramSocket(UDP_PORT, InetAddress.getByName("0.0.0.0"));
                discoverySocket.setBroadcast(true);
                discoveryThread = new Thread(this::serveDiscovery, "SharePro-Discovery");
                discoveryThread.start();
            } catch (IOException discoveryError) {
                // QR/direct-IP pairing still works even when UDP discovery is unavailable.
                discoverySocket = null;
            }
        }

        void stop() {
            running.set(false);
            try { if (serverSocket != null) serverSocket.close(); } catch (Exception ignored) {}
            try { if (discoverySocket != null) discoverySocket.close(); } catch (Exception ignored) {}
            executor.shutdownNow();
            if (httpThread != null) httpThread.interrupt();
            if (discoveryThread != null) discoveryThread.interrupt();
        }

        void serveHttp() {
            while (running.get()) {
                try {
                    Socket socket = serverSocket.accept();
                    executor.execute(() -> handleHttp(socket));
                } catch (IOException e) {
                    if (running.get()) e.printStackTrace();
                }
            }
        }

        void handleHttp(Socket socket) {
            try (Socket client = socket) {
                client.setSoTimeout(2500);
                InputStream in = client.getInputStream();
                byte[] headerBytes = readUntilHeaderEnd(in, 16 * 1024);
                if (headerBytes == null) return;

                String headerText = new String(headerBytes, StandardCharsets.ISO_8859_1);
                String[] lines = headerText.split("\\r\\n");
                if (lines.length == 0) return;
                String[] first = lines[0].split(" ", 3);
                if (first.length < 2) {
                    writeJson(client, 400, "{\"ok\":false,\"error\":\"Bad request\"}");
                    return;
                }

                String method = first[0];
                String target = first[1];
                int contentLength = 0;
                String tokenHeader = "";
                String roleHeader = "";
                for (int i = 1; i < lines.length; i++) {
                    String header = lines[i];
                    int colon = header.indexOf(':');
                    if (colon <= 0) continue;
                    String name = header.substring(0, colon).trim().toLowerCase(Locale.US);
                    String value = header.substring(colon + 1).trim();
                    if ("content-length".equals(name)) {
                        try { contentLength = Integer.parseInt(value); } catch (Exception ignored) {}
                    } else if ("x-sp-token".equals(name)) {
                        tokenHeader = value;
                    } else if ("x-sp-role".equals(name)) {
                        roleHeader = value;
                    }
                }

                if (!token.equals(tokenHeader)) {
                    writeJson(client, 401, "{\"ok\":false,\"error\":\"Unauthorized\"}");
                    return;
                }
                if (!("sender".equals(roleHeader) || "receiver".equals(roleHeader))) {
                    writeJson(client, 400, "{\"ok\":false,\"error\":\"Invalid role\"}");
                    return;
                }

                byte[] bodyBytes = new byte[0];
                if ("POST".equals(method)) {
                    if (contentLength < 0 || contentLength > MAX_BODY_BYTES) {
                        writeJson(client, 413, "{\"ok\":false,\"error\":\"Payload too large\"}");
                        return;
                    }
                    bodyBytes = new byte[contentLength];
                    int read = 0;
                    while (read < contentLength) {
                        int n = in.read(bodyBytes, read, contentLength - read);
                        if (n == -1) break;
                        read += n;
                    }
                    if (read != contentLength) {
                        writeJson(client, 400, "{\"ok\":false,\"error\":\"Incomplete request body\"}");
                        return;
                    }
                }
                String body = new String(bodyBytes, StandardCharsets.UTF_8);

                if ("GET".equals(method) && target.startsWith("/v1/ping")) {
                    JSONObject json = new JSONObject();
                    json.put("ok", true);
                    json.put("room", room);
                    json.put("deviceName", deviceName);
                    writeJson(client, 200, json.toString());
                    return;
                }

                if ("POST".equals(method) && "/v1/signal".equals(target)) {
                    if (body.isEmpty()) {
                        writeJson(client, 400, "{\"ok\":false,\"error\":\"Missing body\"}");
                        return;
                    }
                    new JSONObject(body); // validate JSON before queueing.
                    if ("sender".equals(roleHeader)) {
                        toReceiver.offer(body);
                    } else {
                        toSender.offer(body);
                    }
                    writeJson(client, 200, "{\"ok\":true}");
                    return;
                }

                if ("GET".equals(method) && target.startsWith("/v1/signal")) {
                    ConcurrentLinkedQueue<String> queue = "sender".equals(roleHeader) ? toSender : toReceiver;
                    String message = queue.poll();
                    JSONObject json = new JSONObject();
                    json.put("ok", true);
                    if (message == null) json.put("message", JSONObject.NULL);
                    else json.put("message", new JSONObject(message));
                    writeJson(client, 200, json.toString());
                    return;
                }

                writeJson(client, 404, "{\"ok\":false,\"error\":\"Not found\"}");
            } catch (Exception ignored) {
                // A peer closing a connection during discovery/cancel is normal.
            }
        }

        private static byte[] readUntilHeaderEnd(InputStream in, int maxBytes) throws IOException {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            int matched = 0;
            int b;
            while ((b = in.read()) != -1) {
                out.write(b);
                if (out.size() > maxBytes) throw new IOException("HTTP headers too large");
                if (matched == 0 && b == '\r') matched = 1;
                else if (matched == 1 && b == '\n') matched = 2;
                else if (matched == 2 && b == '\r') matched = 3;
                else if (matched == 3 && b == '\n') return out.toByteArray();
                else matched = b == '\r' ? 1 : 0;
            }
            return null;
        }

        void writeJson(Socket socket, int status, String body) throws IOException {
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            OutputStream out = socket.getOutputStream();
            String statusText;
            switch (status) {
                case 200: statusText = "OK"; break;
                case 400: statusText = "Bad Request"; break;
                case 401: statusText = "Unauthorized"; break;
                case 404: statusText = "Not Found"; break;
                case 413: statusText = "Payload Too Large"; break;
                default: statusText = "Error";
            }
            String headers = "HTTP/1.1 " + status + " " + statusText + "\r\n"
                    + "Content-Type: application/json; charset=utf-8\r\n"
                    + "Access-Control-Allow-Origin: *\r\n"
                    + "Connection: close\r\n"
                    + "Content-Length: " + bytes.length + "\r\n\r\n";
            out.write(headers.getBytes(StandardCharsets.US_ASCII));
            out.write(bytes);
            out.flush();
        }

        void serveDiscovery() {
            if (discoverySocket == null) return;
            byte[] buffer = new byte[2048];
            while (running.get()) {
                try {
                    DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                    discoverySocket.receive(packet);
                    String query = new String(packet.getData(), packet.getOffset(), packet.getLength(), StandardCharsets.UTF_8);
                    String[] parts = query.split("\\|", 4);
                    if (parts.length < 3 || !"SP2".equals(parts[0]) || !"DISCOVER".equals(parts[1])) continue;
                    String requested = parts[2];
                    if (!("*".equals(requested) || room.equals(requested))) continue;

                    String response = "SP2|REPLY|" + room + "|" + token + "|" + port + "|" + deviceName + "|sharepro";
                    byte[] payload = response.getBytes(StandardCharsets.UTF_8);
                    DatagramPacket out = new DatagramPacket(payload, payload.length, packet.getAddress(), packet.getPort());
                    discoverySocket.send(out);
                } catch (IOException e) {
                    if (running.get()) e.printStackTrace();
                }
            }
        }

        static String createToken() {
            byte[] bytes = new byte[24];
            new SecureRandom().nextBytes(bytes);
            return Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        }

        static String findLocalIpv4() {
            String fallback = null;
            try {
                Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
                if (interfaces != null) {
                    while (interfaces.hasMoreElements()) {
                        NetworkInterface ni = interfaces.nextElement();
                        if (!ni.isUp() || ni.isLoopback()) continue;
                        String name = ni.getName().toLowerCase(Locale.US);
                        int score = (name.startsWith("wlan") || name.startsWith("ap")) ? 3
                                : (name.startsWith("eth") || name.startsWith("en")) ? 2 : 1;
                        Enumeration<InetAddress> addresses = ni.getInetAddresses();
                        while (addresses.hasMoreElements()) {
                            InetAddress address = addresses.nextElement();
                            if (!(address instanceof Inet4Address) || address.isLoopbackAddress() || address.isLinkLocalAddress()) continue;
                            String value = address.getHostAddress();
                            if (score == 3 && isPrivateIpv4(value)) return value;
                            if (fallback == null && (score >= 2 || isPrivateIpv4(value))) fallback = value;
                        }
                    }
                }
            } catch (Exception ignored) {}
            return fallback == null ? "127.0.0.1" : fallback;
        }

        static boolean isPrivateIpv4(String value) {
            return value.startsWith("10.") || value.startsWith("192.168.") || value.matches("172\\.(1[6-9]|2[0-9]|3[0-1])\\..*");
        }
    }
}
