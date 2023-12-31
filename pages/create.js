import React, { useState } from "react";
import useSWR from "swr";
import Switch from "react-switch";
import styled from "styled-components";
import { v4 as uuidv4 } from "uuid";
import RegularTaskInputForm from "../components/RegularTaskInputForm";
import AiTaskInputForm from "../components/AiTaskInputForm";
import useLocalStorageState from "use-local-storage-state";
import { toast } from "react-toastify";
import Layout from "../components/Layout";
import { useRouter } from "next/router";
import { StyledContainer } from "../components/StyledContainer";
import Image from "next/image";

const headerText = "create task";
const homeButtonShow = true;

// Task data for initial state
const initialTaskData = {
  title: "",
  subtasks: [],
  tags: [],
  deadline: "",
  priority: "",
  original_task_description: "",
};

// Mesagges for info banners
const BannerMessageCreated = () => <div>Task created!</div>;
const BannerMessageFailed = () => <div>Complete your task description!</div>;
const BannerMessageAISuccess = () => <div>Complete your task details!</div>;

export default function CreateTaskPage() {
  const { mutate, isLoading, error } = useSWR("/api/tasks");
  const router = useRouter();

  // State to check whether aiMode is on (aiMode change is triggered with aiMode switch)
  const [aiMode, setAiMode] = useLocalStorageState("aiMode", false);

  // State to check whether app is waiting for POST, GET, PATCH and DELETE responses
  const [pageIsLoading, setPageIsLoading] = useState(false);

  // State for task data which is coming from OpenAI API
  const [aiTaskData, setAiTaskData] = useState(initialTaskData);

  // State to check whether OpenAI gave a bad response
  // If it is the case, user gets a chance to edit the query
  const [aiResponseStatus, setAiResponseStatus] = useState(true);

  // Function to add a task
  async function addTask(newTaskData) {
    // While app is waiting for API response (pageIsLoading === true) user sees an animation
    setPageIsLoading(true);
    // If the user sends post request in regular mode the post request goes directly to the data base
    if (!aiMode) {
      // Send a POST request to the database to create a new task
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTaskData),
      });
      if (response.ok) {
        // Trigger a re-fetch of tasks after successful creation
        mutate();
        router.push(`/`);
      }

      // Info banner
      toast.success(<BannerMessageCreated />, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });

      setAiTaskData(initialTaskData);
      setAiResponseStatus(true);

      // If the user sends post request in aiMode mode the post request goes directly to the OpenAI API
    } else {
      try {
        // Send a POST request to OpenAI API to generate task details
        const response = await fetch("/api/tasks/ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newTaskData),
        });

        // Check if response from OpenAI API is ok
        if (response.ok) {
          // Save response from OpenAI API in a variable newAiTaskData
          const newAiTaskData = await response.json();

          // Check whether newAiTaskData has a title and subtasks
          if (
            newAiTaskData.title &&
            newAiTaskData.title !== "" &&
            newAiTaskData.subtasks &&
            newAiTaskData.subtasks.length > 0
          ) {
            // Add unique ID and a value key to each subtask
            newAiTaskData.subtasks = newAiTaskData.subtasks.map((subtask) => ({
              value: subtask,
              id: uuidv4(),
            }));

            newAiTaskData.original_task_description =
              newTaskData.original_task_description;

            // Set aiTaskData variable to the populated OpenAI API response (newAiTaskData)
            setAiTaskData(newAiTaskData);

            // Switch to regular mode where regular input form prefilled with AI task data is displayed
            // In this regular mode user can add additional details to the task
            setAiMode(false);

            // Info banner
            toast.info(<BannerMessageAISuccess />, {
              position: "top-center",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "colored",
            });
          } else {
            // Handle case when OpenAI API does not provide valid data
            setAiTaskData({
              title: "",
              subtasks: [],
              tags: [],
              deadline: null,
              priority: "",
              original_task_description: newTaskData.original_task_description,
            });

            // Stay in aiMode where ai task input form prefilled with original task description (query)
            // Here the user can edit the query and send a post request on OpenAI API again to get a better response
            setAiMode(true);
            setAiResponseStatus(false);

            // Info banner
            toast.error(<BannerMessageFailed />, {
              position: "top-center",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "colored",
            });
          }
        } else {
          // Handle case when AI task generation fails
          setAiTaskData({
            title: "",
            subtasks: [],
            tags: [],
            deadline: null,
            priority: "",
            originalTaskDescription: newTaskData.taskDescription,
            // Stay in aiMode where ai task input form prefilled with original task description (query)
            // Here the user can edit the query and send a post request on OpenAI API again to get a better response
          });
          setAiMode(true);
          setAiResponseStatus(false);

          // Info banner
          toast.error(<BannerMessageFailed />, {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
          });
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }

    setPageIsLoading(false);
  }

  return (
    <Layout headerText={headerText} homeButtonShow={homeButtonShow}>
      {pageIsLoading || error || isLoading ? (
        // Display loading UI when the task is being created
        <LoadingBackground>
          <LoadingContainer>
            <Gif
              src="/loading.gif"
              alt="circle loading gif"
              width={200}
              height={200}
            />
          </LoadingContainer>
        </LoadingBackground>
      ) : (
        // Display switch for AI mode
        <StyledContainer name="styled-container">
          <SwitchWrapper>
            <label>
              <BoldText>AI</BoldText>
            </label>
            <Switch
              checked={aiMode !== undefined ? aiMode : false}
              onChange={() => setAiMode(!aiMode)}
              onColor="#cec7ff"
              onHandleColor="#a194fa"
              offColor="#bdbdbd"
              offHandleColor="#1d1d1d"
              handleDiameter={24}
              uncheckedIcon={false}
              checkedIcon={false}
              height={16}
              width={40}
            />
          </SwitchWrapper>
          {aiMode ? (
            <AiTaskInputForm
              onSubmit={addTask}
              formName={"create-task"}
              newAiTaskData={aiTaskData}
            />
          ) : (
            <RegularTaskInputForm
              onSubmit={addTask}
              formName={"create-task"}
              newAiTaskData={aiTaskData}
              aiResponseStatus={aiResponseStatus}
            />
          )}
        </StyledContainer>
      )}
    </Layout>
  );
}

// Styled components

const SwitchWrapper = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  align-items: end;
  padding: 1rem;
  width: 100%;
`;

const BoldText = styled.span`
  font-weight: 700;
`;

const LoadingBackground = styled.div`
  position: fixed;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  background-color: #1d1d1d;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background-color: #1d1d1d;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
`;

const Gif = styled(Image)`
  border-radius: 100%;
`;
