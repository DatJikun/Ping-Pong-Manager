#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    pingpong_manager_lib::run();
}
