"use client";

import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import DeleteIcon from "@mui/icons-material/Delete";
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
  const { tasks, deleteTask, toggleStar } = useTaskContext();
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

  // Sort each section: starred first, then by date
  Object.values(sections).forEach((section) => {
    section.tasks.sort((a, b) => {
      if (a.isStarred !== b.isStarred) {
        return a.isStarred ? -1 : 1;
      }
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
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
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {section.title}
              </Typography>
              <Stack spacing={2}>
                {section.tasks.length === 0 ? (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        일정이 없습니다.
                      </Typography>
                    </CardContent>
                  </Card>
                ) : (
                  section.tasks.map((task) => (
                    <Card key={task.id} variant="outlined" sx={{ position: "relative" }}>
                      <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1, pr: 1 }}>
                            {task.title}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => toggleStar(task.id)}
                              sx={{ color: task.isStarred ? "gold" : "action.active" }}
                            >
                              {task.isStarred ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => deleteTask(task.id)}
                              sx={{ color: "error.main" }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        {task.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            {task.description}
                          </Typography>
                        )}
                        <Chip
                          label={new Date(task.startDate).toLocaleDateString("ko-KR")}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.75rem" }}
                        />
                      </CardContent>
                    </Card>
                  ))
                )}
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
