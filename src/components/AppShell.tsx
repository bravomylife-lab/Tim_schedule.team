"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import HandshakeRounded from "@mui/icons-material/HandshakeRounded";
import LightbulbRounded from "@mui/icons-material/LightbulbRounded";
import LibraryMusicRounded from "@mui/icons-material/LibraryMusicRounded";
import SelfImprovementRounded from "@mui/icons-material/SelfImprovementRounded";
import ShowChartRounded from "@mui/icons-material/ShowChartRounded";
import MusicNoteRounded from "@mui/icons-material/MusicNoteRounded";
import AlbumRounded from "@mui/icons-material/AlbumRounded";
import SyncButton from "@/components/SyncButton";
import DriveButton from "@/components/DriveButton";

const drawerWidth = 280;

const navigationItems = [
  { href: "/", label: "Overview", icon: <DashboardRounded /> },
  { href: "/collab", label: "협업", icon: <HandshakeRounded /> },
  { href: "/hold-fix", label: "Hold / Fix", icon: <LibraryMusicRounded /> },
  { href: "/release-schedule", label: "릴리즈 스케줄", icon: <AlbumRounded /> },
  { href: "/pitching", label: "피칭아이디어", icon: <LightbulbRounded /> },
  { href: "/personal", label: "개인 스케줄", icon: <SelfImprovementRounded /> },
  { href: "/stock", label: "주식 일정", icon: <ShowChartRounded /> },
  { href: "/song-camp", label: "송캠프", icon: <MusicNoteRounded /> },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid rgba(0,0,0,0.06)",
            background: "linear-gradient(180deg, #ffffff 0%, #f3f6ff 100%)",
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
            Tim
          </Typography>
          <Typography variant="body2" color="text.secondary">
            PEERMUSIC A&R 전문 비서
          </Typography>
        </Box>
        <Divider />
        <List sx={{ px: 2, py: 2, flex: 1 }}>
          {navigationItems.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={
                pathname === item.href || (item.href === "/" && pathname === "/overview")
              }
              sx={{
                borderRadius: 3,
                mb: 0.5,
                "&.Mui-selected": {
                  backgroundColor: "rgba(53, 89, 227, 0.12)",
                  "&:hover": {
                    backgroundColor: "rgba(53, 89, 227, 0.18)",
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 44 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ px: 3, pb: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <SyncButton />
          <DriveButton />
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flex: 1,
          p: { xs: 2, md: 3 },
          background:
            "radial-gradient(circle at top, rgba(53, 89, 227, 0.08), transparent 45%), linear-gradient(180deg, #f7f9ff 0%, #f5f6fb 100%)",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: "1600px", mx: "auto" }}>{children}</Box>
      </Box>
    </Box>
  );
}
