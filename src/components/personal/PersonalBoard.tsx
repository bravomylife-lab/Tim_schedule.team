"use client";

import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import SectionHeader from "@/components/SectionHeader";
import { useTaskContext } from "@/contexts/TaskContext";
import { TimTask } from "@/types/tim";

// Helper to categorize personal tasks if subCategory is missing
function getPersonalSubCategory(task: TimTask & { subCategory?: string }) {
  if (task.subCategory) return task.subCategory;

  const text = `${task.title} ${task.description ?? ""}`.toLowerCase();
  if (text.includes("브라보팝") || text.includes("youtube") || text.includes("유투브")) {
    return "YOUTUBE";
  }
  if (text.includes("app") || text.includes("테스트") || text.includes("자동화") || text.includes("ai")) {
    return "AUTOMATION";
  }
  return "GENERAL";
}

export default function PersonalBoard() {
  const { tasks } = useTaskContext();
  const personalTasks = tasks.filter((task) => task.category === "PERSONAL");

  const sections = {
    GENERAL: { title: "개인 일정", tasks: [] as typeof personalTasks },
    YOUTUBE: { title: "YOUTUBE (브라보팝)", tasks: [] as typeof personalTasks },
    AUTOMATION: { title: "AI 자동화 (APP/테스트)", tasks: [] as typeof personalTasks },
  };

  personalTasks.forEach((task) => {
    const sub = getPersonalSubCategory(task as any);
    if (sub === "YOUTUBE") sections.YOUTUBE.tasks.push(task);
    else if (sub === "AUTOMATION") sections.AUTOMATION.tasks.push(task);
    else sections.GENERAL.tasks.push(task);
  });

  return (
    <Box>
      <SectionHeader title="개인 스케줄" subtitle="개인 일정, 유튜브, 자동화 업무를 분리하여 관리합니다" />
      <Alert severity="info" sx={{ mb: 3 }}>
        주식 관련 일정(수익, 매출, 엔비디아 등)은 주식 탭으로 자동 분류됩니다.
      </Alert>
      <Grid container spacing={3}>
        {Object.entries(sections).map(([key, section]) => (
          <Grid size={{ xs: 12, md: 4 }} key={key}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  {section.title}
                </Typography>
                <List dense>
                  {section.tasks.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      일정이 없습니다.
                    </Typography>
                  ) : (
                    section.tasks.map((task) => (
                      <ListItem key={task.id} disablePadding sx={{ mb: 1 }}>
                        <ListItemText
                          primary={task.title}
                          secondary={task.description}
                          primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                        />
                    </ListItem>
                    ))
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
