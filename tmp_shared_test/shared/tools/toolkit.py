from agno.tools import tool


@tool(description="Updated shared helper")
def updated_shared_tool(agent):
    return "updated"


TOOLS = [updated_shared_tool]
