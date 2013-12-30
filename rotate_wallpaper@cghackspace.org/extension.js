const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Soup = imports.gi.Soup;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const prefs = Me.imports.prefs


const PNG_EXT = ".png";
const JPEG_EXT = ".jpg";

let button, settings, main_session, text, wallpaper_links, wallpapers;
let wp_link = "http://wallpapers.wallbase.cc/rozne/wallpaper-";

function createSession() {
    main_session = new Soup.SessionAsync();
    Soup.Session.prototype.add_feature.call(main_session, new Soup.ProxyResolverDefault());
    Soup.Session.prototype.add_feature.call(main_session, new Soup.CookieJar());
}

function login() {
    var request = Soup.Message.new('GET', "http://wallbase.cc/user/login");
    request.request_headers.append("Cache-Control", "max-age=0");
    request.request_headers.append("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
    request.request_headers.append("Referer", "http://wallbase.cc/");
    request.request_headers.append("Accept-Encoding", "gzip,deflate,sdch");
    request.request_headers.append("Accept-Language", "en-US,en;q=0.8,pt-BR;q=0.6,pt;q=0.4");
    request.request_headers.append("User-Agent", "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36");
    main_session.queue_message(request, function(session, message) {
        if (message.status_code !== 200) { return; }
        var body = message.response_body.data;
        var str = "name=\"csrf\" value=\"";
        var index = body.indexOf(str) + str.length;
        var csrf = "";
        while (body[index] !== "\"") {
            csrf += body[index];
            index++;
        }
        str = "name=\"ref\" value=\"";
        index = body.indexOf(str) + str.length;
        var ref = "";
        while (body[index] !== "\"") {
            ref += body[index];
            index++;
        }
        var cookies = Soup.cookies_from_response(message);
        request = Soup.form_request_new_from_hash("POST", "http://wallbase.cc/user/do_login",
            {"csrf": csrf, "ref": ref, "username": prefs.prefs.username, "password": prefs.prefs.password});
        request.request_headers.append("Cache-Control", "max-age=0");
        request.request_headers.append("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
        request.request_headers.append("Origin", "http://wallbase.cc");
        request.request_headers.append("Referer", "http://wallbase.cc/user/login");
        request.request_headers.append("Accept-Encoding", "gzip,deflate,sdch");
        request.request_headers.append("Accept-Language", "en-US,en;q=0.8,pt-BR;q=0.6,pt;q=0.4");
        request.request_headers.append("User-Agent", "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36");
        session.queue_message(request, function(session, message) {
            if (request.status_code !== 200) {

            }
            var request2 = Soup.Message.new('GET', "http://wallbase.cc/favorites");
            request2.request_headers.append("Cache-Control", "max-age=0");
            request2.request_headers.append("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
            request2.request_headers.append("Referer", "http://wallbase.cc/");
            request2.request_headers.append("Accept-Encoding", "gzip,deflate,sdch");
            request2.request_headers.append("Accept-Language", "en-US,en;q=0.8,pt-BR;q=0.6,pt;q=0.4");
            request2.request_headers.append("User-Agent", "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36");
            session.queue_message(request2, function(session, request) {
                if (request.status_code !== 200) {

                }
                var str = request.response_body.data;
                var href = "<a href=\"http://wallbase.cc/wallpaper/";
                var index = str.indexOf(href);
                while (index !== -1) {
                    index += href.length;
                    var link = "";
                    // while (str[index++] !== "\"");
                    // index++;
                    while (str[index] !== "\"") {
                        link += str[index];
                        index++;
                    } 
                    wallpaper_links.push(link);
                    str = str.slice(index, -1);
                    index = str.indexOf(href);
                }
                    // saveWallpaper(wallpaper_links[i]);
                var random_wallpaper = wallpaper_links[Math.floor(Math.random() * wallpaper_links.length)];
                var new_wallpaper = saveWallpaper(random_wallpaper);
                print(random_wallpaper);
                print(new_wallpaper.get_path());
                settings.set_string("picture-uri", "file://" + new_wallpaper.get_path());
                Gio.Settings.sync();
            });
        })
    });
}

function saveWallpaper(wallpaper) {
    var file = Gio.file_new_for_path(".rotate_wallpapers/" + wallpaper);
    if (file.query_exists(null)) {
        return file;
    }
    var image;
    var ext = PNG_EXT;
    image = Gio.file_new_for_uri(wp_link + wallpaper + ext);
    if (!image.query_exists(null)) {
        ext = JPEG_EXT;
        image = Gio.file_new_for_uri(wp_link + wallpaper + ext);
    }
    if (!image.query_exists(null)) {
        print("Failed to get image " + wallpaper);
    }
    if (!file.query_exists(null)) {
        try {
            image.copy(file, Gio.FileCopyFlags.ALL_METADATA, null, function(progress, total, data) {});
        } catch (e) {
            print(e);
        }
    }
    return file;
}

function setWallpaper(path) {
    var request = Soup.Message.new('GET',
        'http://wallbase.cc');
    main_session.queue_message(request, function(session, message) {
    //     if (message.status_code !== 200) {

    //     }
    });

    settings.set_string("picture-uri", path)
    Gio.Settings.sync();
}

function _start() {
    createSession();
    login();
}

function init() {
    var folder = Gio.file_new_for_path(".rotate_wallpapers");
    if (!folder.query_exists(null)) {
        folder.make_directory(null);
    }
    wallpaper_links = [];
    wallpapers = [];
    settings = new Gio.Settings({schema: "org.gnome.desktop.background"});

    button = new St.Bin({ style_class: 'panel-button',
                          reactive: true,
                          can_focus: true,
                          x_fill: true,
                          y_fill: false,
                          track_hover: true });
    let icon = new St.Icon({ icon_name: 'system-run-symbolic',
                             style_class: 'system-status-icon' });
    button.set_child(icon);
    button.connect('button-press-event', _start);
}

function enable() {
    Main.panel._rightBox.insert_child_at_index(button, 0);
}

function disable() {
    Main.panel._rightBox.remove_child(button);
}
